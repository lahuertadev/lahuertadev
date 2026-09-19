import pytest
from datetime import date

from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad
from producto.models import Producto
from mercado.models import Mercado
from proveedor.models import Proveedor
from compra.models import Compra
from compra_producto.models import CompraProducto
from compra_producto.repositories import BuyProductRepository


@pytest.mark.django_db
class TestBuyProductRepository:
    def setup_method(self):
        self.repository = BuyProductRepository()

        category = Categoria.objects.create(descripcion="Frutas")
        container_type = TipoContenedor.objects.create(descripcion="Cajon")
        unit_type = TipoUnidad.objects.create(descripcion="Kilo")

        self.producto_sin_compras = Producto.objects.create(
            descripcion="Sin compras",
            categoria=category,
            tipo_contenedor=container_type,
            tipo_unidad=unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.2,
        )
        self.producto_con_compras = Producto.objects.create(
            descripcion="Con compras",
            categoria=category,
            tipo_contenedor=container_type,
            tipo_unidad=unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.2,
        )

        mercado = Mercado.objects.create(descripcion="Mercado Central")
        proveedor = Proveedor.objects.create(
            nombre="Proveedor Test",
            puesto=1,
            telefono="1234",
            nombre_fantasia="Proveedor Test",
            mercado=mercado,
        )
        compra = Compra.objects.create(
            fecha=date.today(),
            importe=1000,
            senia=0,
            proveedor=proveedor,
        )
        CompraProducto.objects.create(
            producto=self.producto_con_compras,
            compra=compra,
            cantidad_producto=5,
            precio_bulto=1000,
            precio_unitario=200,
        )

    def test_verify_product_on_buys_true_cuando_tiene_compras(self):
        assert self.repository.verify_product_on_buys(self.producto_con_compras.id) is True

    def test_verify_product_on_buys_false_cuando_no_tiene_compras(self):
        assert self.repository.verify_product_on_buys(self.producto_sin_compras.id) is False
