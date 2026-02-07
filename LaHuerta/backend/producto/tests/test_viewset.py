import pytest
from unittest.mock import Mock, patch

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad
from producto.models import Producto
from producto.views import ProductViewSet
from producto.interfaces import IProductRepository
from producto.exceptions import ProductNotFoundException


def _mock_model_instance(model_cls, **attrs):
    mock_obj = Mock(spec=model_cls)
    for k, v in attrs.items():
        setattr(mock_obj, k, v)
    # DRF validators (e.g. UniqueValidator) suelen usar instance.pk
    if "id" in attrs:
        mock_obj.pk = attrs["id"]
    mock_obj._meta = Mock()
    mock_obj._meta.model = model_cls
    return mock_obj


def _create_mock_product(id, descripcion, categoria, tipo_contenedor, tipo_unidad, cantidad_por_bulto=10, peso_aproximado=1.2):
    return _mock_model_instance(
        Producto,
        id=id,
        descripcion=descripcion,
        categoria=categoria,
        tipo_contenedor=tipo_contenedor,
        tipo_unidad=tipo_unidad,
        cantidad_por_bulto=cantidad_por_bulto,
        peso_aproximado=peso_aproximado,
    )


class FakeRepo(IProductRepository):
    def __init__(self):
        self._items = {}

    # CRUD estándar
    def get_all(self, description=None, category=None, container_type=None):
        items = list(self._items.values())
        if description is not None:
            items = [i for i in items if i.descripcion == description]
        return items

    def get_by_id(self, id):
        if int(id) in self._items:
            return self._items[int(id)]
        raise ProductNotFoundException(f"Producto con ID {id} no encontrado")

    def create(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        prod = _create_mock_product(
            id=new_id,
            descripcion=data["descripcion"],
            categoria=data["categoria"],
            tipo_contenedor=data["tipo_contenedor"],
            tipo_unidad=data["tipo_unidad"],
            cantidad_por_bulto=data["cantidad_por_bulto"],
            peso_aproximado=data["peso_aproximado"],
        )
        self._items[new_id] = prod
        return prod

    def update(self, product, validated_data):
        for k, v in validated_data.items():
            setattr(product, k, v)
        return product

    def delete(self, product):
        self._items.pop(int(product.id), None)

    # específicos
    def verify_products_with_category_id(self, category_id):
        return False

    def verify_products_with_container_type_id(self, container_id):
        return False

    def verify_products_with_unit_type_id(self, unit_id):
        return False


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return ProductViewSet(repository=FakeRepo())


@pytest.fixture
def fk_data(db):
    """
    Crea FKs reales para que ProductCreateSerializer/ProductUpdateSerializer validen.
    """
    category = Categoria.objects.create(descripcion="Frutas")
    container_type = TipoContenedor.objects.create(descripcion="Cajon")
    unit_type = TipoUnidad.objects.create(descripcion="Kilo")
    return category, container_type, unit_type


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get("/product/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_list_with_items(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    # precargar repo fake
    viewset.repository.create(
        {
            "descripcion": "Manzana",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2,
        }
    )

    request = factory.get("/product/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["descripcion"] == "Manzana"


# ------------------------- RETRIEVE ------------------------
@pytest.mark.django_db
def test_retrieve_success(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    created = viewset.repository.create(
        {
            "descripcion": "Banana",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 12,
            "peso_aproximado": 1.5,
        }
    )

    request = factory.get(f"/product/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "Banana"


def test_retrieve_not_found(factory, viewset):
    request = factory.get("/product/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


def test_list_internal_error(factory):
    class ExplodingRepo(FakeRepo):
        def get_all(self, description=None, category=None, container_type=None):
            raise Exception("boom")

    viewset = ProductViewSet(repository=ExplodingRepo())
    request = factory.get("/product/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 500
    assert "error" in response.data["detail"].lower()


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    request = factory.post(
        "/product/",
        {
            "descripcion": "Pera",
            "categoria": category.id,
            "tipo_contenedor": container_type.id,
            "tipo_unidad": unit_type.id,
            "cantidad_por_bulto": 8,
            "peso_aproximado": 1.1,
        },
        format="json",
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["descripcion"] == "Pera"


@pytest.mark.django_db
def test_create_validation_error(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    request = factory.post(
        "/product/",
        {
            "descripcion": "",
            "categoria": category.id,
            "tipo_contenedor": container_type.id,
            "tipo_unidad": unit_type.id,
            "cantidad_por_bulto": 8,
            "peso_aproximado": 1.1,
        },
        format="json",
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


@pytest.mark.django_db
def test_create_duplicate_description_returns_custom_message(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    # crear en DB para que el UniqueValidator lo detecte
    Producto.objects.create(
        descripcion="Duplicado",
        categoria=category,
        tipo_contenedor=container_type,
        tipo_unidad=unit_type,
        cantidad_por_bulto=10,
        peso_aproximado=1.0,
    )

    request = factory.post(
        "/product/",
        {
            "descripcion": "Duplicado",
            "categoria": category.id,
            "tipo_contenedor": container_type.id,
            "tipo_unidad": unit_type.id,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.0,
        },
        format="json",
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert response.data["descripcion"][0] == "Producto con esa descripción ya existe."


# ------------------------- UPDATE/PATCH --------------------
@pytest.mark.django_db
def test_patch_success(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    created = viewset.repository.create(
        {
            "descripcion": "Old",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2,
        }
    )

    request = factory.patch(
        f"/product/{created.id}/",
        {"descripcion": "New"},
        format="json",
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"


@pytest.mark.django_db
def test_patch_validation_error(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    created = viewset.repository.create(
        {
            "descripcion": "Old2",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2,
        }
    )

    request = factory.patch(
        f"/product/{created.id}/",
        {"cantidad_por_bulto": "no-es-numero"},
        format="json",
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "cantidad_por_bulto" in response.data


@pytest.mark.django_db
def test_patch_duplicate_description_returns_custom_message(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    # producto existente en DB (el que ya tiene la descripcion "Existente")
    Producto.objects.create(
        descripcion="Existente",
        categoria=category,
        tipo_contenedor=container_type,
        tipo_unidad=unit_type,
        cantidad_por_bulto=10,
        peso_aproximado=1.0,
    )

    # el objeto a actualizar lo resuelve el repo fake; solo importa que tenga pk distinto
    created = viewset.repository.create(
        {
            "descripcion": "Otro",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2,
        }
    )

    request = factory.patch(
        f"/product/{created.id}/",
        {"descripcion": "Existente"},
        format="json",
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=created.id)

    assert response.status_code == 400
    assert response.data["descripcion"][0] == "Producto con esa descripción ya existe."


# ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_delete_success(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    created = viewset.repository.create(
        {
            "descripcion": "Eliminar",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2,
        }
    )

    # Patch de repos externos para permitir borrado
    with patch("producto.views.ProductPriceListRepository") as P1, patch(
        "producto.views.BillProductRepository"
    ) as P2, patch("producto.views.BuyProductRepository") as P3:
        P1.return_value.verify_product_on_price_list.return_value = False
        P2.return_value.verify_product_on_bill.return_value = False
        P3.return_value.verify_product_on_buys.return_value = False

        request = factory.delete(f"/product/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 204


@pytest.mark.django_db
def test_delete_blocked_by_price_list(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    created = viewset.repository.create(
        {
            "descripcion": "NoEliminar",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2,
        }
    )

    with patch("producto.views.ProductPriceListRepository") as P1, patch(
        "producto.views.BillProductRepository"
    ) as P2, patch("producto.views.BuyProductRepository") as P3:
        P1.return_value.verify_product_on_price_list.return_value = True
        P2.return_value.verify_product_on_bill.return_value = False
        P3.return_value.verify_product_on_buys.return_value = False

        request = factory.delete(f"/product/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "lista de precios" in response.data["detail"].lower()


@pytest.mark.django_db
def test_delete_blocked_by_bill(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    created = viewset.repository.create(
        {
            "descripcion": "NoEliminarFactura",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2,
        }
    )

    with patch("producto.views.ProductPriceListRepository") as P1, patch(
        "producto.views.BillProductRepository"
    ) as P2, patch("producto.views.BuyProductRepository") as P3:
        P1.return_value.verify_product_on_price_list.return_value = False
        P2.return_value.verify_product_on_bill.return_value = True
        P3.return_value.verify_product_on_buys.return_value = False

        request = factory.delete(f"/product/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "factura" in response.data["detail"].lower()


@pytest.mark.django_db
def test_delete_blocked_by_buy(factory, viewset, fk_data):
    category, container_type, unit_type = fk_data
    created = viewset.repository.create(
        {
            "descripcion": "NoEliminarCompra",
            "categoria": category,
            "tipo_contenedor": container_type,
            "tipo_unidad": unit_type,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2,
        }
    )

    with patch("producto.views.ProductPriceListRepository") as P1, patch(
        "producto.views.BillProductRepository"
    ) as P2, patch("producto.views.BuyProductRepository") as P3:
        P1.return_value.verify_product_on_price_list.return_value = False
        P2.return_value.verify_product_on_bill.return_value = False
        P3.return_value.verify_product_on_buys.return_value = True

        request = factory.delete(f"/product/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "compra" in response.data["detail"].lower()


def test_delete_not_found(factory, viewset):
    request = factory.delete("/product/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()
