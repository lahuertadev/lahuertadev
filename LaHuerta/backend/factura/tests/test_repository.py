import pytest
from datetime import date
from decimal import Decimal

from factura.models import Factura
from factura.repositories import BillRepository
from tipo_factura.models import TipoFactura
from cliente.models import Cliente
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_facturacion.models import TipoFacturacion
from lista_precios.models import ListaPrecios
from localidad.models import Localidad
from municipio.models import Municipio
from provincia.models import Provincia


@pytest.mark.django_db
class TestBillRepository:
    def setup_method(self):
        self.repository = BillRepository()

        prov = Provincia.objects.create(nombre="Buenos Aires")
        muni = Municipio.objects.create(nombre="La Matanza", provincia=prov)
        localidad = Localidad.objects.create(id="12345678", nombre="Ciudadela", municipio=muni)
        tipo_facturacion = TipoFacturacion.objects.create(descripcion="Cuenta Corriente")
        condicion_iva = TipoCondicionIva.objects.create(descripcion="Resp. Inscripto")
        lista_precios = ListaPrecios.objects.create(descripcion="Lista General")

        self.bill_type = TipoFactura.objects.create(
            descripcion="Remito X", abreviatura="X", codigo_afip=None
        )
        self.bill_type_b = TipoFactura.objects.create(
            descripcion="Factura B", abreviatura="B", codigo_afip=6
        )
        self.client = Cliente.objects.create(
            cuit="20123456789",
            razon_social="Cliente Test",
            cuenta_corriente=Decimal("0.00"),
            localidad=localidad,
            tipo_facturacion=tipo_facturacion,
            condicion_IVA=condicion_iva,
            telefono="1234567890",
            lista_precios=lista_precios,
        )

    def _create_bill(self, amount=Decimal("1000.00"), bill_type=None, numero=None):
        return Factura.objects.create(
            cliente=self.client,
            tipo_factura=bill_type or self.bill_type,
            fecha=date.today(),
            importe=amount,
            numero_comprobante=numero,
        )

    # ── get_all ────────────────────────────────────────────────────────────────

    def test_get_all_returns_all(self):
        self._create_bill()
        self._create_bill()
        assert self.repository.get_all().count() == 2

    def test_get_all_empty(self):
        assert self.repository.get_all().count() == 0

    def test_get_all_filter_by_cliente_id(self):
        self._create_bill()
        assert self.repository.get_all(cliente_id=self.client.id).count() == 1
        assert self.repository.get_all(cliente_id=9999).count() == 0

    def test_get_all_filter_by_cuit(self):
        self._create_bill()
        assert self.repository.get_all(cuit="20123456789").count() == 1
        assert self.repository.get_all(cuit="99999999999").count() == 0

    def test_get_all_filter_by_razon_social(self):
        self._create_bill()
        assert self.repository.get_all(razon_social="Cliente").count() == 1
        assert self.repository.get_all(razon_social="Inexistente").count() == 0

    def test_get_all_filter_by_importe_min(self):
        self._create_bill(amount=Decimal("500.00"))
        self._create_bill(amount=Decimal("2000.00"))
        assert self.repository.get_all(importe_min=Decimal("1000.00")).count() == 1

    def test_get_all_filter_by_importe_max(self):
        self._create_bill(amount=Decimal("500.00"))
        self._create_bill(amount=Decimal("2000.00"))
        assert self.repository.get_all(importe_max=Decimal("1000.00")).count() == 1

    def test_get_all_filter_by_fecha_desde(self):
        self._create_bill()
        assert self.repository.get_all(fecha_desde=date.today()).count() == 1

    def test_get_all_filter_by_fecha_hasta(self):
        self._create_bill()
        assert self.repository.get_all(fecha_hasta=date.today()).count() == 1

    def test_get_all_ordered_by_fecha_desc(self):
        b1 = self._create_bill(amount=Decimal("100"))
        b2 = self._create_bill(amount=Decimal("200"))
        result = list(self.repository.get_all())
        assert result[0].id == b2.id

    # ── get_by_id ──────────────────────────────────────────────────────────────

    def test_get_by_id_ok(self):
        bill = self._create_bill()
        result = self.repository.get_by_id(bill.id)
        assert result.id == bill.id

    def test_get_by_id_not_found_returns_none(self):
        result = self.repository.get_by_id(9999)
        assert result is None

    # ── create ─────────────────────────────────────────────────────────────────

    def test_create_ok(self):
        bill = self.repository.create(
            client=self.client,
            bill_type=self.bill_type,
            date=date.today(),
            amount=Decimal("1500.00"),
        )
        assert bill.id is not None
        assert bill.importe == Decimal("1500.00")
        assert Factura.objects.count() == 1

    # ── get_last_receipt_number ────────────────────────────────────────────────

    def test_get_last_receipt_number_no_bills(self):
        assert self.repository.get_last_receipt_number(self.bill_type.id) == 0

    def test_get_last_receipt_number_returns_max(self):
        self._create_bill(numero=5)
        self._create_bill(numero=12)
        assert self.repository.get_last_receipt_number(self.bill_type.id) == 12

    def test_get_last_receipt_number_isolated_by_type(self):
        self._create_bill(numero=7, bill_type=self.bill_type)
        self._create_bill(numero=3, bill_type=self.bill_type_b)
        assert self.repository.get_last_receipt_number(self.bill_type.id) == 7
        assert self.repository.get_last_receipt_number(self.bill_type_b.id) == 3
