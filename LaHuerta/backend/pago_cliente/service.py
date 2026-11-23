from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status
from tipo_pago import constants as payment_types
from cliente.interfaces import IClientRepository
from cheque.interfaces import ICheckRepository
from .constants import PaymentState
from .interfaces import IClientPaymentRepository
from .exceptions import (
    ClientPaymentNotFoundException,
    CheckAlreadyExistsException,
    PaymentCancelBlockedException,
    PaymentEditBlockedException,
    CheckEditBlockedException,
)

# Datos de un cheque que se pueden corregir al editar el pago. El importe, solo si está en cartera.
EDITABLE_CHECK_FIELDS = ('numero', 'banco', 'importe', 'fecha_emision', 'fecha_deposito')


def _is_rejected(check):
    return bool(check.estado and check.estado.descripcion == check_status.RECHAZADO)


def _is_in_wallet(check):
    return bool(check.estado and check.estado.descripcion == check_status.EN_CARTERA)


def _is_check_payment(payment_type):
    return payment_type.descripcion == payment_types.CHEQUE


def apply_rejected_check(payment_repository, client_repository, check):
    '''
    El cheque rechazado no se cobró: su importe vuelve a la cuenta corriente del cliente y se
    descuenta del pago. Si era el último cheque sin rechazar, el pago se anula.
    '''
    payment = check.pago_cliente
    amount = Decimal(str(check.importe))
    client = payment.cliente
    client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) + amount
    client_repository.update_balance(client)

    checks = list(payment.cheque_set.all())
    if any(not _is_rejected(other) for other in checks if other.id != check.id):
        return payment_repository.update(payment, {'importe': Decimal(str(payment.importe)) - amount})

    # El pago anulado muestra lo que el cliente intentó pagar: la suma de todos sus cheques.
    label = 'Cheques rechazados' if len(checks) > 1 else 'Cheque rechazado'
    return payment_repository.update(payment, {
        'importe': sum((Decimal(str(other.importe)) for other in checks), Decimal('0')),
        'estado_pago': PaymentState.ANULADO,
        'fecha_anulacion': timezone.localdate(),
        'motivo_anulacion': f'{label}: ' + ', '.join(f'N° {other.numero}' for other in checks),
    })


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
        client = data['cliente']
        checks = (data.get('cheques') or []) if _is_check_payment(data['tipo_pago']) else []
        for check in checks:
            self._validate_no_duplicate_check(check['numero'], check['banco'], client)

        payment = self.payment_repository.create(
            client=client,
            payment_type=data['tipo_pago'],
            payment_date=data['fecha_pago'],
            amount=data['importe'],
            observations=data.get('observaciones'),
        )

        client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) - Decimal(str(data['importe']))
        self.client_repository.update_balance(client)

        self._create_checks(payment, checks)
        return payment

    @transaction.atomic
    def update_payment(self, payment_id: int, data: dict):
        '''
        Un pago con cheques no cambia de cliente ni de tipo de pago: eso se corrige anulándolo y
        cargándolo de nuevo. Un pago sin cheques se edita entero.
        '''
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')
        if payment.estado_pago == PaymentState.ANULADO:
            raise PaymentEditBlockedException('No se puede editar un pago anulado.')

        if _is_check_payment(payment.tipo_pago):
            self._update_check_payment(payment, data)
        else:
            self._update_payment_without_checks(payment, data)

        return self.payment_repository.get_by_id(payment.id)

    def _update_check_payment(self, payment, data):
        '''
        Cambia la fecha, las observaciones y los cheques: corrige sus datos, agrega nuevos y quita
        los que están en cartera. El importe del pago sigue a los cheques y la diferencia se ajusta
        en la cuenta corriente del cliente.
        '''
        if not _is_check_payment(data.get('tipo_pago', payment.tipo_pago)):
            raise PaymentEditBlockedException(
                'Para cambiar el tipo de pago de un pago con cheques, anulá el pago y cargalo de nuevo.'
            )
        if data.get('cliente', payment.cliente) != payment.cliente:
            raise PaymentEditBlockedException(
                'Para cambiar el cliente de un pago con cheques, anulá el pago y cargalo de nuevo.'
            )

        updates, new_checks, removed = (
            self._plan_check_changes(payment, data['cheques']) if 'cheques' in data else ([], [], [])
        )
        difference = (
            sum((Decimal(str(changes['importe'])) - Decimal(str(check.importe))
                 for check, changes in updates if 'importe' in changes), Decimal('0'))
            + sum((Decimal(str(check['importe'])) for check in new_checks), Decimal('0'))
            - sum((Decimal(str(check.importe)) for check in removed), Decimal('0'))
        )

        payment_data = {field: data[field] for field in ('fecha_pago', 'observaciones') if field in data}
        if difference:
            payment_data['importe'] = Decimal(str(payment.importe)) + difference
            client = payment.cliente
            client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) - difference
            self.client_repository.update_balance(client)

        self.payment_repository.update(payment, payment_data)
        for check, changes in updates:
            self.check_repository.update(check, changes)
        for check in removed:
            self.check_repository.delete(check)
        self._create_checks(payment, new_checks)

    def _plan_check_changes(self, payment, entries):
        '''
        Valida los cheques que llegan contra los del pago. Devuelve los cambios a los que ya tiene
        (pares cheque, cambios), los cheques nuevos (sin id) y los que se quitan.
        '''
        current = {check.id: check for check in payment.cheque_set.all()}
        kept_ids = [entry['id'] for entry in entries if entry.get('id') is not None]
        if any(check_id not in current for check_id in kept_ids):
            raise PaymentEditBlockedException('Uno de los cheques no pertenece a este pago.')

        removed = [check for check_id, check in current.items() if check_id not in kept_ids]
        for check in removed:
            self._validate_removable(check)

        new_checks = [entry for entry in entries if entry.get('id') is None]
        for entry in new_checks:
            self._validate_no_duplicate_check(entry['numero'], entry['banco'], payment.cliente)

        updates = []
        for entry in entries:
            if entry.get('id') is None:
                continue
            check = current[entry['id']]
            changes = {
                field: entry.get(field) for field in EDITABLE_CHECK_FIELDS
                if field in entry and entry.get(field) != getattr(check, field)
            }
            if not changes:
                continue

            if check.endosado:
                raise CheckEditBlockedException(self._endorsed_message(check, 'No se pueden modificar los datos del'))
            if 'importe' in changes and not _is_in_wallet(check):
                raise PaymentEditBlockedException(
                    f'No se puede cambiar el importe del cheque N° {check.numero}: ya no está en cartera. '
                    'Para corregirlo, anulá el pago y cargalo de nuevo.'
                )
            if 'numero' in changes or 'banco' in changes:
                self._validate_no_duplicate_check(
                    changes.get('numero', check.numero), changes.get('banco', check.banco),
                    payment.cliente, exclude_id=check.id,
                )
            updates.append((check, changes))
        return updates, new_checks, removed

    def _validate_removable(self, check):
        '''Solo se quita un cheque en cartera que nunca se usó en un pago a proveedor.'''
        if check.endosado:
            raise CheckEditBlockedException(self._endorsed_message(check, 'No se puede quitar el'))
        if not _is_in_wallet(check):
            raise PaymentEditBlockedException(
                f'No se puede quitar el cheque N° {check.numero}: ya no está en cartera. '
                'Para corregirlo, anulá el pago y cargalo de nuevo.'
            )
        payment_ids = self.check_repository.get_purchase_payment_ids(check)
        if payment_ids:
            numbers = ', '.join(f'N° {payment_id:08d}' for payment_id in payment_ids)
            raise PaymentEditBlockedException(
                f'No se puede quitar el cheque N° {check.numero}: se usó en el pago a proveedor {numbers}, '
                'que lo conserva como registro aunque esté anulado. '
                'Para corregirlo, anulá el pago y cargalo de nuevo.'
            )

    @staticmethod
    def _endorsed_message(check, action):
        return (
            f'{action} cheque N° {check.numero}: '
            f'ya fue endosado al proveedor {check.pago_compra.proveedor.nombre} '
            f'(pago del {check.pago_compra.fecha_pago}). '
            'Primero anulá o editá ese pago al proveedor para poder continuar.'
        )

    def _update_payment_without_checks(self, payment, data):
        '''Sin cheques se cambia todo, también a Cheque. La diferencia se ajusta en las cuentas corrientes.'''
        old_client = payment.cliente
        new_client = data.get('cliente', old_client)
        old_amount = Decimal(str(payment.importe))
        new_amount = Decimal(str(data.get('importe', old_amount)))

        new_checks = []
        if _is_check_payment(data.get('tipo_pago', payment.tipo_pago)):
            new_checks = data.get('cheques') or []
            for check in new_checks:
                self._validate_no_duplicate_check(check['numero'], check['banco'], new_client)

        if new_client != old_client:
            old_client.cuenta_corriente = Decimal(str(old_client.cuenta_corriente)) + old_amount
            self.client_repository.update_balance(old_client)
            new_client.cuenta_corriente = Decimal(str(new_client.cuenta_corriente)) - new_amount
            self.client_repository.update_balance(new_client)
        elif new_amount != old_amount:
            old_client.cuenta_corriente = Decimal(str(old_client.cuenta_corriente)) - (new_amount - old_amount)
            self.client_repository.update_balance(old_client)

        self.payment_repository.update(payment, {key: value for key, value in data.items() if key != 'cheques'})
        self._create_checks(payment, new_checks)

    def _create_checks(self, payment, checks):
        if not checks:
            return
        in_wallet = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        for check in checks:
            self.check_repository.create({
                'numero': check['numero'],
                'importe': check['importe'],
                'fecha_emision': check['fecha_emision'],
                'fecha_deposito': check.get('fecha_deposito'),
                'banco': check['banco'],
                'estado': in_wallet,
                'pago_cliente': payment,
                'endosado': False,
            })

    @transaction.atomic
    def cancel_payment(self, payment_id: int, reason: str):
        '''
        Anula el pago: devuelve el importe a la cuenta corriente del cliente y anula sus cheques.
        Los cheques rechazados quedan como están: el rechazo ya los descontó del pago.
        '''
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')
        if payment.estado_pago == PaymentState.ANULADO:
            raise PaymentCancelBlockedException('El pago ya está anulado.')

        checks = list(payment.cheque_set.all())
        endorsed = next((check for check in checks if check.endosado and not _is_rejected(check)), None)
        if endorsed:
            raise PaymentCancelBlockedException(
                f'No se puede anular el pago porque el cheque N° {endorsed.numero} ya fue endosado '
                f'al proveedor {endorsed.pago_compra.proveedor.nombre} (pago del {endorsed.pago_compra.fecha_pago}). '
                'Primero anulá o editá ese pago al proveedor para poder continuar.'
            )

        client = payment.cliente
        client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) + Decimal(str(payment.importe))
        self.client_repository.update_balance(client)

        cancelled = None
        for check in checks:
            if _is_rejected(check):
                continue
            cancelled = cancelled or EstadoCheque.objects.get(descripcion=check_status.ANULADO)
            self.check_repository.update(check, {'estado': cancelled})

        return self.payment_repository.update(payment, {
            'estado_pago': PaymentState.ANULADO,
            'fecha_anulacion': timezone.localdate(),
            'motivo_anulacion': reason,
        })

    def _validate_no_duplicate_check(self, number, bank, client, exclude_id=None):
        if self.check_repository.exists_duplicate(number, bank, client, exclude_id=exclude_id):
            raise CheckAlreadyExistsException(
                f'Ya existe un cheque N° {number} del banco {bank.descripcion} para este cliente.'
            )
