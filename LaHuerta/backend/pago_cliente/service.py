from decimal import Decimal
from django.db import transaction
from .interfaces import IClientPaymentRepository
from .exceptions import (
    ClientPaymentNotFoundException,
    PaymentTypeChangeBlockedException,
    CheckAlreadyExistsException,
    PaymentDeletionBlockedException,
    CheckEditBlockedException,
)
from cliente.interfaces import IClientRepository
from cheque.interfaces import ICheckRepository
from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status


class ClientPaymentService:

    def __init__(
        self,
        payment_repository: IClientPaymentRepository,
        client_repository: IClientRepository,
        check_repository: ICheckRepository,
    ):
        self.payment_repository = payment_repository
        self.client_repository = client_repository
        self.check_repository = check_repository

    @transaction.atomic
    def create_payment(self, data: dict):
        payment = self.payment_repository.create(
            client=data['cliente'],
            payment_type=data['tipo_pago'],
            payment_date=data['fecha_pago'],
            amount=data['importe'],
            observations=data.get('observaciones'),
        )

        client = data['cliente']
        client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) - Decimal(str(data['importe']))
        self.client_repository.update_balance(client)

        if data['tipo_pago'].descripcion == 'Cheque':
            self._validate_no_duplicate_check(data['cheque_numero'], data['cheque_banco'], client)
            in_wallet = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
            self.check_repository.create({
                'numero': data['cheque_numero'],
                'importe': data['importe'],
                'fecha_emision': data['cheque_fecha_emision'],
                'fecha_deposito': data.get('cheque_fecha_deposito'),
                'banco': data['cheque_banco'],
                'estado': in_wallet,
                'pago_cliente': payment,
                'endosado': False,
            })

        return payment

    @transaction.atomic
    def update_payment(self, payment_id: int, data: dict):
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')

        old_tipo_pago = payment.tipo_pago
        new_tipo_pago = data.get('tipo_pago', old_tipo_pago)
        old_is_check = old_tipo_pago.descripcion == 'Cheque'
        new_is_check = new_tipo_pago.descripcion == 'Cheque'

        check = payment.cheque_set.first()

        old_total_amount = payment.importe
        old_client = payment.cliente
        new_total_amount = data.get('importe', old_total_amount)
        new_client = data.get('cliente', old_client)

        client_changed = old_client != new_client
        amount_changed = old_total_amount != new_total_amount

        if old_is_check and not new_is_check:
            if check and check.endosado:
                raise PaymentTypeChangeBlockedException(
                    'No se puede cambiar el tipo de pago porque el cheque asociado ya fue endosado.'
                )
            if check:
                self.check_repository.delete(check)
            check = None

        elif not old_is_check and new_is_check:
            self._validate_no_duplicate_check(data['cheque_numero'], data['cheque_banco'], new_client)
            in_wallet = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
            self.check_repository.create({
                'numero': data['cheque_numero'],
                'importe': data.get('importe', payment.importe),
                'fecha_emision': data['cheque_fecha_emision'],
                'fecha_deposito': data.get('cheque_fecha_deposito'),
                'banco': data['cheque_banco'],
                'estado': in_wallet,
                'pago_cliente': payment,
                'endosado': False,
            })
            check = None

        elif old_is_check and new_is_check and check:
            effective_number = data.get('cheque_numero', check.numero)
            effective_bank = data.get('cheque_banco', check.banco)
            effective_check_amount = data.get('importe', check.importe)
            effective_issue_date = data.get('cheque_fecha_emision', check.fecha_emision)
            effective_deposit_date = data.get('cheque_fecha_deposito', check.fecha_deposito)

            number_changed = effective_number != check.numero
            bank_changed = effective_bank != check.banco
            check_amount_changed = effective_check_amount != check.importe
            issue_date_changed = effective_issue_date != check.fecha_emision
            deposit_date_changed = effective_deposit_date != check.fecha_deposito
            changes_check_data = (
                client_changed or number_changed or bank_changed or check_amount_changed
                or issue_date_changed or deposit_date_changed
            )

            if changes_check_data and check.endosado:
                proveedor = check.pago_compra.compra.proveedor.nombre
                payment_date = check.pago_compra.fecha_pago
                raise CheckEditBlockedException(
                    f'No se pueden modificar los datos del cheque N° {check.numero}: '
                    f'ya fue endosado al proveedor {proveedor} (pago del {payment_date}). '
                    'Primero eliminá o editá ese pago al proveedor para poder continuar.'
                )

            if client_changed or number_changed or bank_changed:
                self._validate_no_duplicate_check(effective_number, effective_bank, new_client, exclude_id=check.id)

        if client_changed:
            old_client.cuenta_corriente = Decimal(str(old_client.cuenta_corriente)) + Decimal(str(old_total_amount))
            self.client_repository.update_balance(old_client)

            new_client.cuenta_corriente = Decimal(str(new_client.cuenta_corriente)) - Decimal(str(new_total_amount))
            self.client_repository.update_balance(new_client)

        elif amount_changed:
            difference = Decimal(str(new_total_amount)) - Decimal(str(old_total_amount))
            old_client.cuenta_corriente = Decimal(str(old_client.cuenta_corriente)) - difference
            self.client_repository.update_balance(old_client)

        check_fields = {'cheque_numero', 'cheque_banco', 'cheque_fecha_emision', 'cheque_fecha_deposito'}
        payment_data = {k: v for k, v in data.items() if k not in check_fields}
        self.payment_repository.update(payment, payment_data)

        if old_is_check and new_is_check and check:
            check_updates = {}
            if 'cheque_numero' in data:
                check_updates['numero'] = data['cheque_numero']
            if 'cheque_banco' in data:
                check_updates['banco'] = data['cheque_banco']
            if 'cheque_fecha_emision' in data:
                check_updates['fecha_emision'] = data['cheque_fecha_emision']
            if 'cheque_fecha_deposito' in data:
                check_updates['fecha_deposito'] = data.get('cheque_fecha_deposito')
            if 'importe' in data:
                check_updates['importe'] = data['importe']
            if check_updates:
                self.check_repository.update(check, check_updates)

        return payment

    @transaction.atomic
    def delete_payment(self, payment_id: int):
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')

        check = payment.cheque_set.first()
        if check and check.endosado:
            supplier = check.pago_compra.compra.proveedor.nombre
            payment_date = check.pago_compra.fecha_pago
            raise PaymentDeletionBlockedException(
                f'No se puede eliminar el pago porque el cheque N° {check.numero} ya fue endosado '
                f'al proveedor {supplier} (pago del {payment_date}). '
                'Primero eliminá o editá ese pago al proveedor para poder continuar.'
            )

        client = payment.cliente
        client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) + Decimal(str(payment.importe))
        self.client_repository.update_balance(client)

        if check:
            self.check_repository.delete(check)

        self.payment_repository.delete(payment)

    def _validate_no_duplicate_check(self, number, bank, client, exclude_id=None):
        if self.check_repository.exists_duplicate(number, bank, client, exclude_id=exclude_id):
            raise CheckAlreadyExistsException(
                f'Ya existe un cheque N° {number} del banco {bank.descripcion} para este cliente.'
            )
