import pytest
from decimal import Decimal

from provincia.models import Provincia
from municipio.models import Municipio
from localidad.models import Localidad
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_pago.models import TipoPago
from cliente.models import Cliente
from pago_cliente.repositories import ClientPaymentRepository


@pytest.mark.django_db
class TestClientPaymentRepository:
    def setup_method(self):
        self.repository = ClientPaymentRepository()
        provincia = Provincia.objects.create(id='06', nombre='Buenos Aires')
        municipio = Municipio.objects.create(id='064270', nombre='CABA', provincia=provincia)
        localidad = Localidad.objects.create(id='0642701009', nombre='CABA', municipio=municipio)
        tipo_fact = TipoFacturacion.objects.create(descripcion='Factura A')
        condicion_iva = TipoCondicionIva.objects.create(descripcion='RI')
        self.tipo_pago = TipoPago.objects.create(descripcion='Efectivo')
        self.cliente = Cliente.objects.create(
            cuit='20123456789',
            razon_social='Cliente Test SA',
            cuenta_corriente=Decimal('10000.00'),
            telefono='1122334455',
            localidad=localidad,
            tipo_facturacion=tipo_fact,
            condicion_IVA=condicion_iva,
        )

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
        localidad = Localidad.objects.get(id='0642701009')
        tipo_fact = TipoFacturacion.objects.first()
        condicion_iva = TipoCondicionIva.objects.first()
        otro_cliente = Cliente.objects.create(
            cuit='27987654321',
            razon_social='Otro Cliente SRL',
            cuenta_corriente=Decimal('0.00'),
            telefono='9988776655',
            localidad=localidad,
            tipo_facturacion=tipo_fact,
            condicion_IVA=condicion_iva,
        )
        self._make_payment(cliente=self.cliente)
        self._make_payment(cliente=otro_cliente)

        result = self.repository.get_all(client_id=self.cliente.id)

        assert result.count() == 1
        assert result.first().cliente_id == self.cliente.id

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
        tipo_cheque = TipoPago.objects.create(descripcion='Cheque')

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
