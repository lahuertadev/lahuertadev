import pytest
from decimal import Decimal

from mercado.models import Mercado
from proveedor.models import Proveedor
from tipo_contenedor.models import TipoContenedor
from movimiento_vacio.models import MovimientoVacio, MovimientoVacioContenedor
from movimiento_vacio.repositories import EmptyMovementRepository
from movimiento_vacio.enums import EmptyMovementType


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_supplier(name='Proveedor Test'):
    market, _ = Mercado.objects.get_or_create(descripcion='Mercado Test')
    supplier, _ = Proveedor.objects.get_or_create(
        nombre=name,
        defaults={'puesto': 1, 'telefono': '1234567890', 'nombre_fantasia': '', 'mercado': market},
    )
    return supplier


def _make_container_type(description='Cajón Test'):
    return TipoContenedor.objects.create(descripcion=description, abreviacion='c')


def _make_movement(supplier, movement_type=EmptyMovementType.LOAD, date='2026-07-14', amount=Decimal('1000.00')):
    return MovimientoVacio.objects.create(
        proveedor=supplier, fecha=date, tipo=movement_type, importe=amount,
    )


def _container_data(container_type, quantity=5, price=Decimal('4000.00')):
    return {'tipo_contenedor': container_type, 'cantidad': quantity, 'precio_unitario': price}


# ── Tests: get_all ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestGetAll:
    def setup_method(self):
        self.repo = EmptyMovementRepository()

    def test_sin_filtros_devuelve_todos_ordenados_por_fecha_desc(self):
        supplier = _make_supplier()
        older = _make_movement(supplier, date='2026-07-01')
        newer = _make_movement(supplier, date='2026-07-14')

        result = list(self.repo.get_all())

        assert result == [newer, older]

    def test_filtra_por_nombre_de_proveedor_sin_distinguir_mayusculas(self):
        supplier_a = _make_supplier('San Antonio')
        supplier_b = _make_supplier('Don Pepe')
        movement_a = _make_movement(supplier_a)
        _make_movement(supplier_b)

        result = list(self.repo.get_all(supplier_name='antonio'))

        assert result == [movement_a]

    def test_filtra_por_nombre_de_fantasia_del_proveedor(self):
        supplier = _make_supplier('Proveedor Test')
        supplier.nombre_fantasia = 'Verdulería Central'
        supplier.save()
        movement = _make_movement(supplier)
        _make_movement(_make_supplier('Otro Proveedor'))

        result = list(self.repo.get_all(supplier_name='central'))

        assert result == [movement]

    def test_filtra_por_importe_exacto(self):
        supplier = _make_supplier()
        _make_movement(supplier, amount=Decimal('71999.99'))
        exact = _make_movement(supplier, amount=Decimal('72000.00'))
        _make_movement(supplier, amount=Decimal('72000.01'))

        result = list(self.repo.get_all(amount=Decimal('72000')))

        assert result == [exact]

    def test_filtra_por_tipo(self):
        supplier = _make_supplier()
        _make_movement(supplier, movement_type=EmptyMovementType.LOAD)
        movement_return = _make_movement(supplier, movement_type=EmptyMovementType.RETURN)

        result = list(self.repo.get_all(movement_type=EmptyMovementType.RETURN))

        assert result == [movement_return]

    def test_filtra_por_rango_de_fechas(self):
        supplier = _make_supplier()
        _make_movement(supplier, date='2026-06-30')
        inside = _make_movement(supplier, date='2026-07-10')
        _make_movement(supplier, date='2026-07-31')

        result = list(self.repo.get_all(date_from='2026-07-01', date_to='2026-07-20'))

        assert result == [inside]


# ── Tests: get_by_id / create / delete ─────────────────────────────────────────

@pytest.mark.django_db
class TestCrud:
    def setup_method(self):
        self.repo = EmptyMovementRepository()

    def test_get_by_id_existente(self):
        movement = _make_movement(_make_supplier())

        assert self.repo.get_by_id(movement.id) == movement

    def test_get_by_id_inexistente_devuelve_none(self):
        assert self.repo.get_by_id(9999) is None

    def test_create_persiste_movimiento(self):
        supplier = _make_supplier()

        movement = self.repo.create(
            supplier=supplier, date='2026-07-14', movement_type=EmptyMovementType.RETURN,
            receipt_number='264768', amount=Decimal('72000.00'),
        )

        saved = MovimientoVacio.objects.get(id=movement.id)
        assert saved.proveedor == supplier
        assert saved.tipo == EmptyMovementType.RETURN
        assert saved.nro_comprobante == '264768'
        assert saved.importe == Decimal('72000.00')

    def test_delete_elimina_movimiento_y_renglones(self):
        movement = _make_movement(_make_supplier())
        self.repo.create_containers(movement, [_container_data(_make_container_type())])

        self.repo.delete(movement)

        assert not MovimientoVacio.objects.filter(id=movement.id).exists()
        assert not MovimientoVacioContenedor.objects.filter(movimiento_vacio_id=movement.id).exists()


# ── Tests: create_containers / replace_containers ──────────────────────────────

@pytest.mark.django_db
class TestContainers:
    def setup_method(self):
        self.repo = EmptyMovementRepository()

    def test_create_containers_persiste_renglones(self):
        movement = _make_movement(_make_supplier())
        crate = _make_container_type('Cajón Test')
        cage = _make_container_type('Jaula Test')

        self.repo.create_containers(movement, [
            _container_data(crate, 18, Decimal('4000.00')),
            _container_data(cage, 10, Decimal('2000.00')),
        ])

        lines = MovimientoVacioContenedor.objects.filter(movimiento_vacio=movement)
        assert lines.count() == 2
        assert lines.get(tipo_contenedor=crate).cantidad == 18

    def test_replace_containers_reemplaza_solo_los_del_movimiento(self):
        supplier = _make_supplier()
        movement_a = _make_movement(supplier)
        movement_b = _make_movement(supplier)
        crate = _make_container_type('Cajón Test')
        cage = _make_container_type('Jaula Test')
        self.repo.create_containers(movement_a, [_container_data(crate)])
        self.repo.create_containers(movement_b, [_container_data(crate)])

        self.repo.replace_containers(movement_a, [_container_data(cage, 3)])

        lines_a = MovimientoVacioContenedor.objects.filter(movimiento_vacio=movement_a)
        assert lines_a.count() == 1
        assert lines_a.first().tipo_contenedor == cage
        assert MovimientoVacioContenedor.objects.filter(movimiento_vacio=movement_b).count() == 1
