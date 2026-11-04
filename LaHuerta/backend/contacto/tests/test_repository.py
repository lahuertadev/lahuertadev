import pytest
from decimal import Decimal
from django.db import IntegrityError

from provincia.models import Provincia
from municipio.models import Municipio
from localidad.models import Localidad
from tipo_condicion_iva.models import TipoCondicionIva
from cliente.models import Cliente
from mercado.models import Mercado
from proveedor.models import Proveedor
from contacto.models import Contacto
from contacto.repositories import ContactRepository


@pytest.mark.django_db
class TestContactRepository:
    def setup_method(self):
        self.repository = ContactRepository()
        provincia = Provincia.objects.create(id='06', nombre='Buenos Aires')
        municipio = Municipio.objects.create(id='064270', nombre='CABA', provincia=provincia)
        localidad = Localidad.objects.create(id='0642701009', nombre='CABA', municipio=municipio)
        condicion_iva = TipoCondicionIva.objects.create(descripcion='RI')
        self.client = Cliente.objects.create(
            cuit='20123456789', razon_social='Cliente Test', cuenta_corriente=Decimal('0.00'),
            localidad=localidad, condicion_IVA=condicion_iva,
        )
        self.supplier = Proveedor.objects.create(
            nombre='Prov', puesto=1, nombre_fantasia='', mercado=Mercado.objects.create(descripcion='Belgrano'),
        )

    # ------------------------- GET BY OWNER --------------------
    def test_get_contacts_by_owner_only_returns_that_owner(self):
        own = Contacto.objects.create(cliente=self.client, numero='1111111111')
        Contacto.objects.create(proveedor=self.supplier, numero='2222222222')

        result = list(self.repository.get_contacts_by_owner('cliente', self.client))

        assert result == [own]

    def test_get_contacts_by_owner_ordered_by_id(self):
        first = Contacto.objects.create(proveedor=self.supplier, numero='1111111111')
        second = Contacto.objects.create(proveedor=self.supplier, numero='2222222222')

        assert list(self.repository.get_contacts_by_owner('proveedor', self.supplier)) == [first, second]

    # ------------------------- CREATE --------------------------
    def test_create_contact_for_client(self):
        contact = self.repository.create_contact('cliente', self.client, {'numero': '1155551234', 'descripcion': 'Pagos', 'email': 'pagos@cliente.com'})

        contact.refresh_from_db()
        assert contact.cliente == self.client
        assert contact.proveedor is None
        assert (contact.numero, contact.descripcion, contact.email) == ('1155551234', 'Pagos', 'pagos@cliente.com')

    def test_create_contact_for_supplier_with_nulls(self):
        contact = self.repository.create_contact('proveedor', self.supplier, {'numero': '1155551234', 'descripcion': None, 'email': None})

        contact.refresh_from_db()
        assert contact.proveedor == self.supplier
        assert contact.cliente is None
        assert contact.descripcion is None
        assert contact.email is None

    # ------------------------- MODIFY --------------------------
    def test_modify_contact(self):
        contact = Contacto.objects.create(cliente=self.client, numero='1111111111')

        self.repository.modify_contact(contact, {'numero': '1199998888', 'descripcion': 'Compras'})

        contact.refresh_from_db()
        assert (contact.numero, contact.descripcion) == ('1199998888', 'Compras')

    # ------------------------- DELETE --------------------------
    def test_delete_contacts_only_deletes_received_ids(self):
        removed = Contacto.objects.create(cliente=self.client, numero='1111111111')
        kept = Contacto.objects.create(cliente=self.client, numero='2222222222')

        self.repository.delete_contacts([removed.id])

        assert list(Contacto.objects.all()) == [kept]

    # ------------------------- UN SOLO DUEÑO -------------------
    @pytest.mark.parametrize('owners', ['none', 'both'])
    def test_contact_needs_exactly_one_owner(self, owners):
        kwargs = {} if owners == 'none' else {'cliente': self.client, 'proveedor': self.supplier}

        with pytest.raises(IntegrityError):
            Contacto.objects.create(numero='1111111111', **kwargs)
