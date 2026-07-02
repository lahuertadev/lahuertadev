import pytest
from decimal import Decimal

from provincia.models import Provincia
from municipio.models import Municipio
from localidad.models import Localidad
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
from cliente.models import Cliente
from cliente.repositories import ClientRepository


@pytest.mark.django_db
class TestClientRepository:
    def setup_method(self):
        self.repository = ClientRepository()
        provincia = Provincia.objects.create(id='06', nombre='Buenos Aires')
        municipio = Municipio.objects.create(id='064270', nombre='CABA', provincia=provincia)
        self.localidad = Localidad.objects.create(id='0642701009', nombre='CABA', municipio=municipio)
        self.tipo_fact = TipoFacturacion.objects.create(descripcion='Factura A')
        self.condicion_iva = TipoCondicionIva.objects.create(descripcion='RI')

    def _make_client(self, cuit='20123456789', razon_social='Cliente Test SA', cuenta_corriente=Decimal('0.00')):
        return Cliente.objects.create(
            cuit=cuit,
            razon_social=razon_social,
            cuenta_corriente=cuenta_corriente,
            telefono='1122334455',
            localidad=self.localidad,
            tipo_facturacion=self.tipo_fact,
            condicion_IVA=self.condicion_iva,
        )

    # ── GET ALL ─────────────────────────────────────────────────────────────────

    def test_get_all_empty(self):
        result = self.repository.get_all_clients()
        assert result.count() == 0

    def test_get_all_returns_all(self):
        self._make_client(cuit='20111111111', razon_social='Cliente A')
        self._make_client(cuit='20222222222', razon_social='Cliente B')
        assert self.repository.get_all_clients().count() == 2

    def test_get_all_filter_by_cuit(self):
        self._make_client(cuit='20111111111', razon_social='Cliente A')
        self._make_client(cuit='20222222222', razon_social='Cliente B')
        result = self.repository.get_all_clients(cuit='111')
        assert result.count() == 1
        assert result.first().cuit == '20111111111'

    def test_get_all_filter_by_search_query_razon_social(self):
        self._make_client(cuit='20111111111', razon_social='Distribuidora Norte')
        self._make_client(cuit='20222222222', razon_social='Almacén Sur')
        result = self.repository.get_all_clients(searchQuery='Norte')
        assert result.count() == 1
        assert result.first().razon_social == 'Distribuidora Norte'

    def test_get_all_filter_by_search_query_nombre_fantasia(self):
        cliente = self._make_client(cuit='20111111111', razon_social='Empresa X')
        cliente.nombre_fantasia = 'El Rincón'
        cliente.save()
        self._make_client(cuit='20222222222', razon_social='Empresa Y')
        result = self.repository.get_all_clients(searchQuery='Rincón')
        assert result.count() == 1

    # ── GET BY ID ────────────────────────────────────────────────────────────────

    def test_get_client_by_id_ok(self):
        client = self._make_client()
        result = self.repository.get_client_by_id(client.id)
        assert result is not None
        assert result.id == client.id

    def test_get_client_by_id_not_found_returns_none(self):
        result = self.repository.get_client_by_id(9999)
        assert result is None

    # ── GET BY CUIT ──────────────────────────────────────────────────────────────

    def test_get_client_by_cuit_ok(self):
        client = self._make_client(cuit='20111111111')
        result = self.repository.get_client_by_cuit('20111111111')
        assert result is not None
        assert result.id == client.id

    def test_get_client_by_cuit_not_found_returns_none(self):
        result = self.repository.get_client_by_cuit('99999999999')
        assert result is None

    # ── CREATE ───────────────────────────────────────────────────────────────────

    def test_create_client_persiste_en_db(self):
        client = self.repository.create_client({
            'cuit': '20123456789',
            'razon_social': 'Nuevo Cliente SA',
            'cuenta_corriente': Decimal('5000.00'),
            'telefono': '1122334455',
            'localidad': self.localidad,
            'tipo_facturacion': self.tipo_fact,
            'condicion_IVA': self.condicion_iva,
        })
        assert client.id is not None
        assert client.razon_social == 'Nuevo Cliente SA'
        assert client.cuenta_corriente == Decimal('5000.00')

    def test_create_client_con_saldo_inicial(self):
        client = self.repository.create_client({
            'cuit': '20123456789',
            'razon_social': 'Cliente Con Saldo',
            'cuenta_corriente': Decimal('75000.50'),
            'telefono': '1122334455',
            'localidad': self.localidad,
            'tipo_facturacion': self.tipo_fact,
            'condicion_IVA': self.condicion_iva,
        })
        assert client.cuenta_corriente == Decimal('75000.50')

    # ── MODIFY ───────────────────────────────────────────────────────────────────

    def test_modify_client_actualiza_campos(self):
        client = self._make_client()
        self.repository.modify_client(client, {'razon_social': 'Nombre Actualizado'})
        client.refresh_from_db()
        assert client.razon_social == 'Nombre Actualizado'

    def test_modify_client_actualiza_cuenta_corriente(self):
        client = self._make_client(cuenta_corriente=Decimal('0.00'))
        self.repository.modify_client(client, {'cuenta_corriente': Decimal('120000.00')})
        client.refresh_from_db()
        assert client.cuenta_corriente == Decimal('120000.00')

    def test_modify_client_acepta_saldo_negativo(self):
        client = self._make_client(cuenta_corriente=Decimal('0.00'))
        self.repository.modify_client(client, {'cuenta_corriente': Decimal('-5000.00')})
        client.refresh_from_db()
        assert client.cuenta_corriente == Decimal('-5000.00')

    # ── DELETE ───────────────────────────────────────────────────────────────────

    def test_delete_client_elimina_de_db(self):
        client = self._make_client()
        client_id = client.id
        self.repository.delete_client(client)
        assert Cliente.objects.filter(id=client_id).count() == 0

    # ── UPDATE BALANCE ───────────────────────────────────────────────────────────

    def test_update_balance_persiste_cambio(self):
        client = self._make_client(cuenta_corriente=Decimal('1000.00'))
        client.cuenta_corriente = Decimal('3000.00')
        self.repository.update_balance(client)
        client.refresh_from_db()
        assert client.cuenta_corriente == Decimal('3000.00')
