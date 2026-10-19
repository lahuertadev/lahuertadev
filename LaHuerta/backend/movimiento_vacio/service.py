from django.db import transaction
from decimal import Decimal
from .interfaces import IEmptyMovementRepository
from .exceptions import EmptyMovementNotFoundException
from .constants import EmptyMovementType
from proveedor.interfaces import ISupplierRepository


class EmptyMovementService:

    def __init__(
        self,
        empty_movement_repository: IEmptyMovementRepository,
        supplier_repository: ISupplierRepository,
    ):
        self.empty_movement_repository = empty_movement_repository
        self.supplier_repository = supplier_repository

    @transaction.atomic
    def create_movement(self, data: dict):
        containers = data.pop('contenedores')
        supplier = data['proveedor']
        amount = self._calculate_amount(containers)

        movement = self.empty_movement_repository.create(
            supplier=supplier,
            date=data['fecha'],
            movement_type=data['tipo'],
            receipt_number=data.get('nro_comprobante'),
            amount=amount,
        )

        self.empty_movement_repository.create_containers(movement, containers)

        supplier.cuenta_corriente += self._balance_effect(movement.tipo, amount)
        self.supplier_repository.update_balance(supplier)

        return movement

    @transaction.atomic
    def update_movement(self, movement_id: int, data: dict):
        movement = self.empty_movement_repository.get_by_id(movement_id)
        if not movement:
            raise EmptyMovementNotFoundException('Movimiento de vacíos no encontrado.')

        old_supplier = movement.proveedor
        old_effect = self._balance_effect(movement.tipo, movement.importe)

        new_supplier = data.get('proveedor', old_supplier)

        if 'fecha' in data:
            movement.fecha = data['fecha']
        if 'tipo' in data:
            movement.tipo = data['tipo']
        if 'nro_comprobante' in data:
            movement.nro_comprobante = data['nro_comprobante']

        containers = data.get('contenedores', None)
        if containers is not None:
            movement.importe = self._calculate_amount(containers)
            self.empty_movement_repository.replace_containers(movement, containers)

        new_effect = self._balance_effect(movement.tipo, movement.importe)

        self._adjust_supplier_balance(old_supplier, new_supplier, old_effect, new_effect)

        movement.proveedor = new_supplier
        self.empty_movement_repository.save(movement)

        return movement

    @transaction.atomic
    def delete_movement(self, movement_id: int):
        movement = self.empty_movement_repository.get_by_id(movement_id)
        if not movement:
            raise EmptyMovementNotFoundException('Movimiento de vacíos no encontrado.')

        supplier = movement.proveedor

        # Revertir el efecto que tuvo el movimiento sobre la CC.
        supplier.cuenta_corriente -= self._balance_effect(movement.tipo, movement.importe)
        self.supplier_repository.update_balance(supplier)

        # Eliminación de renglones automática por CASCADE
        self.empty_movement_repository.delete(movement)

    @staticmethod
    def _calculate_amount(containers: list[dict]) -> Decimal:
        '''
        Calcula el importe del movimiento: Σ(cantidad × precio_unitario).
        '''
        return sum(
            (Decimal(str(container['cantidad'])) * Decimal(str(container['precio_unitario']))
             for container in containers),
            Decimal('0'),
        )

    @staticmethod
    def _balance_effect(movement_type: str, amount: Decimal) -> Decimal:
        '''
        Efecto sobre la CC del proveedor: la carga suma deuda, la devolución la descuenta.
        '''
        amount = Decimal(str(amount))
        return -amount if movement_type == EmptyMovementType.RETURN else amount

    def _adjust_supplier_balance(self, old_supplier, new_supplier, old_effect: Decimal, new_effect: Decimal) -> None:
        if old_supplier != new_supplier:
            old_supplier.cuenta_corriente -= old_effect
            self.supplier_repository.update_balance(old_supplier)

            new_supplier.cuenta_corriente += new_effect
            self.supplier_repository.update_balance(new_supplier)

            return

        if old_effect != new_effect:
            old_supplier.cuenta_corriente += new_effect - old_effect
            self.supplier_repository.update_balance(old_supplier)
