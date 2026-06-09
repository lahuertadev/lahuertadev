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
            descripcion="Factura B", abreviatura="B2", codigo_afip=6
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

    def _create_bill(self, subtotal=Decimal("1000.00"), total=None, bill_type=None, numero=None):
        return Factura.objects.create(
            cliente=self.client,
            tipo_factura=bill_type or self.bill_type,
            fecha=date.today(),
            subtotal=subtotal,
            total=total or subtotal,
            numero_comprobante=numero,
        )

    # ── get_all ────────────────────────────────────────────────────────────────

    def test_get_all_returns_all(self):
        self._create_bill()
        self._create_bill()
        assert self.repository.get_all().count() == 2

    def test_get_all_empty(self):
        assert self.repository.get_all().count() == 0

    def test_get_all_filter_by_client_id(self):
        self._create_bill()
        assert self.repository.get_all(client_id=self.client.id).count() == 1
        assert self.repository.get_all(client_id=9999).count() == 0

    def test_get_all_filter_by_cuit(self):
        self._create_bill()
        assert self.repository.get_all(cuit="20123456789").count() == 1
        assert self.repository.get_all(cuit="99999999999").count() == 0

    def test_get_all_filter_by_business_name(self):
        self._create_bill()
        assert self.repository.get_all(business_name="Cliente").count() == 1
        assert self.repository.get_all(business_name="Inexistente").count() == 0

    def test_get_all_filter_by_amount_min_usa_total(self):
        self._create_bill(subtotal=Decimal("500"), total=Decimal("552.50"))
        self._create_bill(subtotal=Decimal("2000"), total=Decimal("2210.00"))
        assert self.repository.get_all(amount_min=Decimal("1000")).count() == 1

    def test_get_all_filter_by_amount_max_usa_total(self):
        self._create_bill(subtotal=Decimal("500"), total=Decimal("552.50"))
        self._create_bill(subtotal=Decimal("2000"), total=Decimal("2210.00"))
        assert self.repository.get_all(amount_max=Decimal("1000")).count() == 1

    def test_get_all_filter_by_date_from(self):
        self._create_bill()
        assert self.repository.get_all(date_from=date.today()).count() == 1

    def test_get_all_filter_by_date_to(self):
        self._create_bill()
        assert self.repository.get_all(date_to=date.today()).count() == 1

    def test_get_all_filter_by_bill_type_id(self):
        self._create_bill(bill_type=self.bill_type)
        self._create_bill(bill_type=self.bill_type_b)
        assert self.repository.get_all(bill_type_id=self.bill_type.id).count() == 1

    def test_get_all_ordered_by_fecha_desc(self):
        b1 = self._create_bill(subtotal=Decimal("100"))
        b2 = self._create_bill(subtotal=Decimal("200"))
        result = list(self.repository.get_all())
        assert result[0].id == b2.id

    # ── get_by_id ──────────────────────────────────────────────────────────────

    def test_get_by_id_ok(self):
        bill = self._create_bill()
        assert self.repository.get_by_id(bill.id).id == bill.id

    def test_get_by_id_not_found_returns_none(self):
        assert self.repository.get_by_id(9999) is None

    # ── create ─────────────────────────────────────────────────────────────────

    def test_create_persiste_subtotal_y_total(self):
        bill = self.repository.create(
            client=self.client,
            bill_type=self.bill_type,
            date=date.today(),
            subtotal=Decimal("1500.00"),
            total=Decimal("1657.50"),
        )
        assert bill.id is not None
        assert bill.subtotal == Decimal("1500.00")
        assert bill.total == Decimal("1657.50")
        assert Factura.objects.count() == 1

    def test_create_persiste_factura_asociada(self):
        original = self._create_bill()
        nd = self.repository.create(
            client=self.client,
            bill_type=self.bill_type,
            date=date.today(),
            subtotal=Decimal("500.00"),
            total=Decimal("552.50"),
            associated_bill=original,
        )
        assert nd.factura_asociada_id == original.id

    def test_create_sin_factura_asociada_es_none(self):
        bill = self.repository.create(
            client=self.client,
            bill_type=self.bill_type,
            date=date.today(),
            subtotal=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )
        assert bill.factura_asociada is None

    # ── get_last_receipt_number ────────────────────────────────────────────────

    def test_get_last_receipt_number_sin_facturas(self):
        assert self.repository.get_last_receipt_number(self.bill_type.id) == 0

    def test_get_last_receipt_number_devuelve_maximo(self):
        self._create_bill(numero=5)
        self._create_bill(numero=12)
        assert self.repository.get_last_receipt_number(self.bill_type.id) == 12

    def test_get_last_receipt_number_aislado_por_tipo(self):
        self._create_bill(numero=7, bill_type=self.bill_type)
        self._create_bill(numero=3, bill_type=self.bill_type_b)
        assert self.repository.get_last_receipt_number(self.bill_type.id) == 7
        assert self.repository.get_last_receipt_number(self.bill_type_b.id) == 3
