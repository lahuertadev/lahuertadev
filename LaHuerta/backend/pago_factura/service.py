from django.db import transaction
from .interfaces import IBillPaymentRepository
from .exceptions import BillPaymentNotFoundException, BillPaymentValidationException


class BillPaymentService:

    def __init__(self, bill_payment_repository: IBillPaymentRepository):
        self.repository = bill_payment_repository

    @transaction.atomic
    def create_bill_payment(self, data: dict):
        client_payment = data['pago_cliente']
        bill = data['factura']
        amount_paid = data['importe_abonado']

        self._validate_bill_belongs_to_client(bill, client_payment)
        self._validate_amount_paid(bill, amount_paid)

        return self.repository.create(
            pago_cliente=client_payment,
            factura=bill,
            importe_abonado=amount_paid,
        )

    @transaction.atomic
    def update_bill_payment(self, record_id: int, data: dict):
        record = self.repository.get_by_id(record_id)
        if not record:
            raise BillPaymentNotFoundException('Imputación no encontrada.')

        new_amount = data.get('importe_abonado', record.importe_abonado)
        self._validate_amount_paid(record.factura, new_amount, exclude_id=record.id)

        record.importe_abonado = new_amount
        return self.repository.save(record)

    @transaction.atomic
    def delete_bill_payment(self, record_id: int):
        record = self.repository.get_by_id(record_id)
        if not record:
            raise BillPaymentNotFoundException('Imputación no encontrada.')
        self.repository.delete(record)

    def _validate_bill_belongs_to_client(self, bill, client_payment) -> None:
        if bill.cliente_id != client_payment.cliente_id:
            raise BillPaymentValidationException(
                f'La factura {bill.id} no pertenece al cliente del pago.'
            )

    def _validate_amount_paid(self, bill, amount_paid, exclude_id=None) -> None:
        already_paid = self.repository.get_total_paid_for_bill(bill.id, exclude_id=exclude_id)
        outstanding_balance = bill.importe - already_paid
        if amount_paid > outstanding_balance:
            raise BillPaymentValidationException(
                f'El importe abonado (${amount_paid}) supera el saldo pendiente '
                f'de la factura (${outstanding_balance}).'
            )
