import pytest
from decimal import Decimal

from pago_cliente.repositories import ClientPaymentRepository
from core.tests.factories import make_client, make_payment_type


@pytest.mark.django_db
class TestClientPaymentRepository:
    def setup_method(self):
        self.repository = ClientPaymentRepository()
        self.tipo_pago = make_payment_type(descripcion='Efectivo')
        self.cliente = make_client(razon_social='Cliente Test SA', cuenta_corriente=Decimal('10000.00'))

    def _make_payment(self, cliente=None, importe=Decimal('1000.00'), obs=None):
        return self.repository.create(
            client=cliente or self.cliente,
            payment_type=self.tipo_pago,
            payment_date='2024-01-01',
            amount=importe,
            observations=obs,
        )

    # ------------------------- GET ALL -------------------------
    def test_get_all_empty(self):
        result = self.repository.get_all()
        assert result.count() == 0

    def test_get_all_returns_all(self):
        self._make_payment()
        self._make_payment()
        assert self.repository.get_all().count() == 2

    def test_get_all_filter_by_client_id(self):
        otro_cliente = make_client(razon_social='Otro Cliente SRL')
        self._make_payment(cliente=self.cliente)
        self._make_payment(cliente=otro_cliente)

        result = self.repository.get_all(client_id=self.cliente.id)

        assert result.count() == 1
        assert result.first().cliente_id == self.cliente.id

    def test_get_all_filter_by_business_name(self):
        self._make_payment()
        assert self.repository.get_all(business_name='Cliente Test').count() == 1
        assert self.repository.get_all(business_name='Inexistente').count() == 0

    def test_get_all_filter_by_amount_min(self):
        self._make_payment(importe=Decimal('500.00'))
        self._make_payment(importe=Decimal('2000.00'))
        assert self.repository.get_all(amount_min=Decimal('1000.00')).count() == 1

    def test_get_all_filter_by_amount_max(self):
        self._make_payment(importe=Decimal('500.00'))
        self._make_payment(importe=Decimal('2000.00'))
        assert self.repository.get_all(amount_max=Decimal('1000.00')).count() == 1

    def test_get_all_filter_by_date_from(self):
        self._make_payment()
        assert self.repository.get_all(date_from='2024-01-01').count() == 1
        assert self.repository.get_all(date_from='2024-01-02').count() == 0

    def test_get_all_filter_by_date_to(self):
        self._make_payment()
        assert self.repository.get_all(date_to='2024-01-01').count() == 1
        assert self.repository.get_all(date_to='2023-12-31').count() == 0

    def test_get_all_filter_by_payment_type_id(self):
        otro_tipo = make_payment_type(descripcion='Transferencia')
        self._make_payment()
        payment_transferencia = self.repository.create(
            client=self.cliente, payment_type=otro_tipo, payment_date='2024-01-01', amount=Decimal('100.00'),
        )

        result = self.repository.get_all(payment_type_id=otro_tipo.id)

        assert result.count() == 1
        assert result.first().id == payment_transferencia.id

    # ------------------------- GET BY ID -----------------------
    def test_get_by_id_ok(self):
        payment = self._make_payment()
        result = self.repository.get_by_id(payment.id)
        assert result is not None
        assert result.id == payment.id

    def test_get_by_id_not_found_returns_none(self):
        result = self.repository.get_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_persiste_en_db(self):
        payment = self._make_payment(importe=Decimal('5000.00'), obs='Prueba')
        assert payment.id is not None
        assert payment.importe == Decimal('5000.00')
        assert payment.observaciones == 'Prueba'
        assert payment.cliente == self.cliente
        assert payment.tipo_pago == self.tipo_pago

    # ------------------------- UPDATE --------------------------
    def test_update_modifica_campos(self):
        payment = self._make_payment(importe=Decimal('1000.00'))
        tipo_cheque = make_payment_type(descripcion='Cheque')

        self.repository.update(payment, {
            'importe': Decimal('2500.00'),
            'tipo_pago': tipo_cheque,
            'observaciones': 'Actualizado',
        })

        payment.refresh_from_db()
        assert payment.importe == Decimal('2500.00')
        assert payment.tipo_pago == tipo_cheque
        assert payment.observaciones == 'Actualizado'

    # ------------------------- DELETE --------------------------
    def test_delete_elimina_de_db(self):
        from pago_cliente.models import PagoCliente
        payment = self._make_payment()
        payment_id = payment.id

        self.repository.delete(payment)

        assert PagoCliente.objects.filter(id=payment_id).count() == 0
