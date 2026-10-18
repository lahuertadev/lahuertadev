import pytest
from decimal import Decimal
from unittest.mock import Mock

from movimiento_vacio.service import EmptyMovementService
from movimiento_vacio.interfaces import IEmptyMovementRepository
from movimiento_vacio.exceptions import EmptyMovementNotFoundException
from movimiento_vacio.enums import EmptyMovementType
from proveedor.interfaces import ISupplierRepository


# ── Fake repos ─────────────────────────────────────────────────────────────────

class FakeEmptyMovementRepo(IEmptyMovementRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1
        self.saved = []
        self.deleted = []
        self.created_containers = []
        self.replaced_containers = []

    def get_all(self, supplier_name=None, movement_type=None, date_from=None, date_to=None, amount=None):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, supplier, date, movement_type, receipt_number, amount):
        movement = Mock()
        movement.id = self._next_id
        self._next_id += 1
        movement.proveedor = supplier
        movement.fecha = date
        movement.tipo = movement_type
        movement.nro_comprobante = receipt_number
        movement.importe = amount
        self._items[movement.id] = movement
        return movement

    def save(self, movement):
        self.saved.append(movement)
        return movement

    def delete(self, movement):
        self._items.pop(movement.id, None)
        self.deleted.append(movement)

    def create_containers(self, movement, containers):
        self.created_containers.append((movement, containers))

    def replace_containers(self, movement, containers):
        self.replaced_containers.append((movement, containers))


class FakeSupplierRepo(ISupplierRepository):
    def __init__(self):
        self.updated = []

    def get_all_suppliers(self, searchQuery=None, mercado=None): pass
    def get_supplier_by_id(self, id): pass
    def create_supplier(self, data): pass
    def modify_supplier(self, supplier, data): pass
    def delete_supplier(self, supplier): pass

    def update_balance(self, supplier):
        self.updated.append(supplier.cuenta_corriente)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_service():
    return EmptyMovementService(
        empty_movement_repository=FakeEmptyMovementRepo(),
        supplier_repository=FakeSupplierRepo(),
    )


def _make_supplier(cc=Decimal('0')):
    supplier = Mock()
    supplier.cuenta_corriente = cc
    return supplier


def _make_containers(*lines):
    '''Cada línea es (cantidad, precio_unitario).'''
    return [
        {'tipo_contenedor': Mock(id=index), 'cantidad': quantity, 'precio_unitario': Decimal(str(price))}
        for index, (quantity, price) in enumerate(lines, start=1)
    ]


def _create(service, supplier, movement_type, *lines):
    return service.create_movement({
        'proveedor': supplier,
        'fecha': '2026-07-14',
        'tipo': movement_type,
        'nro_comprobante': '264768',
        'contenedores': _make_containers(*lines),
    })


# ── Tests: create_movement ─────────────────────────────────────────────────────

class TestCreateMovement:

    def test_importe_es_suma_de_cantidad_por_precio(self):
        service = _make_service()

        movement = _create(service, _make_supplier(), EmptyMovementType.RETURN, (18, 4000), (10, 2000))

        assert movement.importe == Decimal('92000')

    def test_carga_suma_importe_a_la_cc(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('1000.00'))

        _create(service, supplier, EmptyMovementType.LOAD, (100, 4000))

        assert supplier.cuenta_corriente == Decimal('401000.00')
        assert len(service.supplier_repository.updated) == 1

    def test_devolucion_resta_importe_de_la_cc(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('400000.00'))

        _create(service, supplier, EmptyMovementType.RETURN, (18, 4000))

        assert supplier.cuenta_corriente == Decimal('328000.00')

    def test_devolucion_parcial_solo_descuenta_lo_devuelto(self):
        service = _make_service()
        supplier = _make_supplier()

        _create(service, supplier, EmptyMovementType.LOAD, (100, 4000))
        _create(service, supplier, EmptyMovementType.RETURN, (70, 4000))

        # Los 30 vacíos no devueltos quedan como deuda en la CC.
        assert supplier.cuenta_corriente == Decimal('120000')

    def test_create_persiste_renglones(self):
        service = _make_service()

        movement = _create(service, _make_supplier(), EmptyMovementType.LOAD, (5, 1000), (3, 2000))

        assert len(service.empty_movement_repository.created_containers) == 1
        created_movement, containers = service.empty_movement_repository.created_containers[0]
        assert created_movement is movement
        assert len(containers) == 2


# ── Tests: update_movement ─────────────────────────────────────────────────────

class TestUpdateMovement:

    def test_update_inexistente_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(EmptyMovementNotFoundException):
            service.update_movement(999, {'fecha': '2026-07-15'})

    def test_update_renglones_recalcula_importe_y_ajusta_cc_por_diferencia(self):
        service = _make_service()
        supplier = _make_supplier()
        movement = _create(service, supplier, EmptyMovementType.LOAD, (10, 1000))  # CC = 10000

        service.update_movement(movement.id, {'contenedores': _make_containers((15, 1000))})

        assert movement.importe == Decimal('15000')
        assert supplier.cuenta_corriente == Decimal('15000')
        assert len(service.empty_movement_repository.replaced_containers) == 1

    def test_update_de_carga_a_devolucion_invierte_el_efecto(self):
        service = _make_service()
        supplier = _make_supplier()
        movement = _create(service, supplier, EmptyMovementType.LOAD, (10, 1000))  # CC = 10000

        service.update_movement(movement.id, {'tipo': EmptyMovementType.RETURN})

        assert supplier.cuenta_corriente == Decimal('-10000')

    def test_update_cambio_de_proveedor_mueve_el_efecto(self):
        service = _make_service()
        old_supplier = _make_supplier()
        new_supplier = _make_supplier(cc=Decimal('500'))
        movement = _create(service, old_supplier, EmptyMovementType.RETURN, (10, 1000))  # old CC = -10000

        service.update_movement(movement.id, {'proveedor': new_supplier})

        assert old_supplier.cuenta_corriente == Decimal('0')
        assert new_supplier.cuenta_corriente == Decimal('-9500')
        assert movement.proveedor is new_supplier

    def test_update_sin_cambios_de_importe_no_toca_cc(self):
        service = _make_service()
        supplier = _make_supplier()
        movement = _create(service, supplier, EmptyMovementType.LOAD, (10, 1000))
        updates_before = len(service.supplier_repository.updated)

        service.update_movement(movement.id, {'fecha': '2026-07-20', 'nro_comprobante': None})

        assert supplier.cuenta_corriente == Decimal('10000')
        assert len(service.supplier_repository.updated) == updates_before
        assert movement.fecha == '2026-07-20'
        assert movement.nro_comprobante is None
        assert len(service.empty_movement_repository.replaced_containers) == 0


# ── Tests: delete_movement ─────────────────────────────────────────────────────

class TestDeleteMovement:

    def test_delete_inexistente_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(EmptyMovementNotFoundException):
            service.delete_movement(999)

    def test_delete_carga_revierte_cc(self):
        service = _make_service()
        supplier = _make_supplier()
        movement = _create(service, supplier, EmptyMovementType.LOAD, (10, 1000))

        service.delete_movement(movement.id)

        assert supplier.cuenta_corriente == Decimal('0')
        assert service.empty_movement_repository.deleted == [movement]

    def test_delete_devolucion_revierte_cc(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('50000'))
        movement = _create(service, supplier, EmptyMovementType.RETURN, (10, 1000))  # CC = 40000

        service.delete_movement(movement.id)

        assert supplier.cuenta_corriente == Decimal('50000')
