import pytest
from decimal import Decimal

from mercado.models import Mercado
from proveedor.models import Proveedor
from compra.models import Compra
from tipo_contenedor.models import TipoContenedor
from compra_vacio.models import CompraVacio
from compra_vacio.repositories import BuyEmptyRepository


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_compra(suffix=''):
    mercado, _ = Mercado.objects.get_or_create(descripcion=f'Mercado Test{suffix}')
    proveedor, _ = Proveedor.objects.get_or_create(
        nombre=f'Proveedor Test{suffix}',
        defaults={'puesto': 1, 'telefono': '1234567890', 'nombre_fantasia': '', 'mercado': mercado},
    )
    return Compra.objects.create(
        proveedor=proveedor,
        fecha='2024-01-01',
        importe=Decimal('1000.00'),
        senia=Decimal('0'),
    )


def _make_contenedor(descripcion='Cajón'):
    return TipoContenedor.objects.create(descripcion=descripcion, abreviacion='c')


def _make_empty_data(contenedor, cantidad=5.0, precio=Decimal('10000.00')):
    return {
        'tipo_contenedor': contenedor,
        'cantidad': cantidad,
        'precio_unitario': precio,
    }


# ── Tests: create_empties ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreateEmpties:
    def setup_method(self):
        self.repo = BuyEmptyRepository()

    def test_create_empties_persiste_registros(self):
        compra = _make_compra()
        cajon = _make_contenedor('Cajón')
        jaula = _make_contenedor('Jaula')

        self.repo.create_empties(compra, [
            _make_empty_data(cajon, cantidad=3.0),
            _make_empty_data(jaula, cantidad=2.0),
        ])

        assert CompraVacio.objects.filter(compra=compra).count() == 2

    def test_create_empties_guarda_campos_correctamente(self):
        compra = _make_compra()
        cajon = _make_contenedor('Cajón')

        self.repo.create_empties(compra, [
            _make_empty_data(cajon, cantidad=4.0, precio=Decimal('8000.00')),
        ])

        vacio = CompraVacio.objects.get(compra=compra)
        assert vacio.tipo_contenedor == cajon
        assert vacio.cantidad == 4.0
        assert vacio.precio_unitario == Decimal('8000.00')

    def test_create_empties_con_lista_vacia_no_crea_nada(self):
        compra = _make_compra()

        self.repo.create_empties(compra, [])

        assert CompraVacio.objects.filter(compra=compra).count() == 0

    def test_create_empties_asocia_a_la_compra_correcta(self):
        compra_a = _make_compra(suffix='A')
        compra_b = _make_compra(suffix='B')
        cajon = _make_contenedor('Cajón')

        self.repo.create_empties(compra_a, [_make_empty_data(cajon)])
        self.repo.create_empties(compra_b, [])

        assert CompraVacio.objects.filter(compra=compra_a).count() == 1
        assert CompraVacio.objects.filter(compra=compra_b).count() == 0


# ── Tests: replace_empties ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReplaceEmpties:
    def setup_method(self):
        self.repo = BuyEmptyRepository()

    def test_replace_empties_elimina_existentes_y_crea_nuevos(self):
        compra = _make_compra()
        cajon = _make_contenedor('Cajón')
        jaula = _make_contenedor('Jaula')
        CompraVacio.objects.create(
            compra=compra, tipo_contenedor=cajon,
            cantidad=3.0, precio_unitario=Decimal('10000.00'),
        )

        self.repo.replace_empties(compra, [_make_empty_data(jaula, cantidad=5.0)])

        vacios = CompraVacio.objects.filter(compra=compra)
        assert vacios.count() == 1
        assert vacios.first().tipo_contenedor == jaula

    def test_replace_empties_con_lista_vacia_elimina_todos(self):
        compra = _make_compra()
        cajon = _make_contenedor('Cajón')
        CompraVacio.objects.create(
            compra=compra, tipo_contenedor=cajon,
            cantidad=2.0, precio_unitario=Decimal('5000.00'),
        )

        self.repo.replace_empties(compra, [])

        assert CompraVacio.objects.filter(compra=compra).count() == 0

    def test_replace_empties_no_afecta_otras_compras(self):
        compra_a = _make_compra(suffix='A')
        compra_b = _make_compra(suffix='B')
        cajon = _make_contenedor('Cajón')
        CompraVacio.objects.create(
            compra=compra_a, tipo_contenedor=cajon,
            cantidad=2.0, precio_unitario=Decimal('5000.00'),
        )
        CompraVacio.objects.create(
            compra=compra_b, tipo_contenedor=cajon,
            cantidad=4.0, precio_unitario=Decimal('5000.00'),
        )

        self.repo.replace_empties(compra_a, [])

        assert CompraVacio.objects.filter(compra=compra_a).count() == 0
        assert CompraVacio.objects.filter(compra=compra_b).count() == 1

    def test_replace_empties_multiples_tipos(self):
        compra = _make_compra()
        cajon = _make_contenedor('Cajón')
        jaula = _make_contenedor('Jaula')
        bandeja = _make_contenedor('Bandeja')
        CompraVacio.objects.create(
            compra=compra, tipo_contenedor=cajon,
            cantidad=1.0, precio_unitario=Decimal('1000.00'),
        )

        self.repo.replace_empties(compra, [
            _make_empty_data(jaula, cantidad=3.0),
            _make_empty_data(bandeja, cantidad=5.0),
        ])

        vacios = CompraVacio.objects.filter(compra=compra).order_by('tipo_contenedor__descripcion')
        assert vacios.count() == 2
        assert vacios[0].tipo_contenedor == bandeja
        assert vacios[1].tipo_contenedor == jaula
