import pytest
from decimal import Decimal

from mercado.models import Mercado
from proveedor.models import Proveedor
from proveedor.repositories import SupplierRepository


@pytest.mark.django_db
class TestSupplierRepository:
    def setup_method(self):
        self.repository = SupplierRepository()
        self.mercado = Mercado.objects.create(descripcion='Belgrano')

    def _make_supplier(self, nombre='Prov1', puesto=1, nave=None, telefono='1234567', nombre_fantasia='Fantasia'):
        return Proveedor.objects.create(
            nombre=nombre,
            puesto=puesto,
            nave=nave,
            telefono=telefono,
            nombre_fantasia=nombre_fantasia,
            cuenta_corriente=0,
            mercado=self.mercado,
        )

    # ------------------------- GET ALL -------------------------
    def test_get_all_returns_all(self):
        self._make_supplier('ProvA')
        self._make_supplier('ProvB')

        result = self.repository.get_all_suppliers()

        assert result.count() == 2

    def test_get_all_empty(self):
        result = self.repository.get_all_suppliers()
        assert result.count() == 0

    def test_get_all_filter_by_nombre(self):
        self._make_supplier('Juan')
        self._make_supplier('Pedro')

        result = self.repository.get_all_suppliers(searchQuery='Juan')

        assert result.count() == 1
        assert result.first().nombre == 'Juan'

    def test_get_all_filter_by_nombre_fantasia(self):
        self._make_supplier('Prov1', nombre_fantasia='Mercadito')
        self._make_supplier('Prov2', nombre_fantasia='OtraFantasia')

        result = self.repository.get_all_suppliers(searchQuery='Mercadito')

        assert result.count() == 1
        assert result.first().nombre_fantasia == 'Mercadito'

    def test_get_all_filter_by_mercado(self):
        otro_mercado = Mercado.objects.create(descripcion='Central')
        self._make_supplier('ProvBelg')
        Proveedor.objects.create(
            nombre='ProvCent',
            puesto=2,
            telefono='9999999',
            nombre_fantasia='CF',
            cuenta_corriente=0,
            mercado=otro_mercado,
        )

        result = self.repository.get_all_suppliers(mercado='Belgrano')

        assert result.count() == 1
        assert result.first().nombre == 'ProvBelg'

    def test_get_all_no_match_returns_empty(self):
        self._make_supplier('Juan')

        result = self.repository.get_all_suppliers(searchQuery='ZZZ')

        assert result.count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_supplier_by_id_ok(self):
        supplier = self._make_supplier()

        result = self.repository.get_supplier_by_id(supplier.id)

        assert result is not None
        assert result.id == supplier.id
        assert result.nombre == 'Prov1'

    def test_get_supplier_by_id_not_found_returns_none(self):
        result = self.repository.get_supplier_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_supplier_ok(self):
        data = {
            'nombre': 'Nuevo',
            'puesto': 5,
            'nave': 2,
            'telefono': '9999999',
            'nombre_fantasia': 'NF',
            'mercado': self.mercado,
        }

        result = self.repository.create_supplier(data)

        assert result.id is not None
        assert result.nombre == 'Nuevo'
        assert Proveedor.objects.count() == 1

    def test_create_supplier_cuenta_corriente_siempre_cero(self):
        data = {
            'nombre': 'Nuevo',
            'puesto': 5,
            'telefono': '9999999',
            'nombre_fantasia': 'NF',
            'mercado': self.mercado,
            'cuenta_corriente': 9999,
        }

        result = self.repository.create_supplier(data)

        assert result.cuenta_corriente == 0

    # ------------------------- MODIFY --------------------------
    def test_modify_supplier_ok(self):
        supplier = self._make_supplier('Original')

        updated = self.repository.modify_supplier(supplier, {
            'nombre': 'Modificado',
            'puesto': 3,
            'telefono': '1111111',
            'nombre_fantasia': 'NuevoFantasia',
            'mercado': self.mercado,
        })

        assert updated.nombre == 'Modificado'
        supplier.refresh_from_db()
        assert supplier.nombre == 'Modificado'
        assert supplier.puesto == 3

    def test_modify_supplier_ignora_cuenta_corriente(self):
        supplier = self._make_supplier()

        self.repository.modify_supplier(supplier, {
            'nombre': 'Prov1',
            'puesto': 1,
            'telefono': '1234567',
            'nombre_fantasia': 'Fantasia',
            'mercado': self.mercado,
            'cuenta_corriente': 9999,
        })

        supplier.refresh_from_db()
        assert supplier.cuenta_corriente == 0

    # ------------------------- DELETE --------------------------
    def test_delete_supplier_ok(self):
        supplier = self._make_supplier()

        self.repository.delete_supplier(supplier)

        assert Proveedor.objects.count() == 0

    # ------------------------- UPDATE BALANCE ------------------
    def test_update_balance_persiste_cuenta_corriente(self):
        supplier = self._make_supplier()
        supplier.cuenta_corriente = Decimal('500.00')

        result = self.repository.update_balance(supplier)

        supplier.refresh_from_db()
        assert supplier.cuenta_corriente == Decimal('500.00')
        assert result.id == supplier.id

    def test_update_balance_no_modifica_otros_campos(self):
        supplier = self._make_supplier()
        supplier.cuenta_corriente = Decimal('100.00')
        supplier.nombre = 'CambioNoGuardado'

        self.repository.update_balance(supplier)

        supplier.refresh_from_db()
        assert supplier.nombre == 'Prov1'
