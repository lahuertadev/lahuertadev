import pytest
from datetime import timedelta
from unittest.mock import Mock

from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request
from rest_framework.parsers import JSONParser
from rest_framework.exceptions import ValidationError

from autenticacion.models import Usuario
from novedad.models import Novedad
from tutorial.models import Tutorial
from novedad.views import NewsViewSet
from novedad.interfaces import INewsRepository


def _make_news(id, titulo='Novedad', fecha_publicacion=None, vigente_hasta=None, seen=False):
    today = timezone.localdate()
    news = Novedad(
        id=id,
        titulo=titulo,
        descripcion='Descripción',
        fecha_publicacion=fecha_publicacion or today,
        vigente_hasta=vigente_hasta or today + timedelta(days=30),
        pantalla_nombre='Facturación',
        pantalla_url='/bill/',
    )
    news.seen = seen
    return news


class FakeNewsRepo(INewsRepository):
    def __init__(self):
        self.items = []
        self.last_pending = None

    def get_visible_for_user(self, user, pending=None):
        self.last_pending = pending
        return self.items

    def get_visible_by_id(self, id, user):
        return next((news for news in self.items if news.id == int(id)), None)

    def mark_as_seen(self, news, user):
        return Mock()


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def user():
    return Usuario(id=1, username='empleado', role=Usuario.EMPLOYEE)


@pytest.fixture
def viewset():
    return NewsViewSet(repository=FakeNewsRepo())


def _request(factory, user, method='get', path='/news/', **kwargs):
    request = getattr(factory, method)(path, **kwargs)
    force_authenticate(request, user=user)
    return Request(request, parsers=[JSONParser()])


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset, user):
    response = viewset.list(_request(factory, user))

    assert response.status_code == 200
    assert response.data == []


def test_list_response_structure(factory, viewset, user):
    viewset.repository.items = [_make_news(1, titulo='Facturar sin lista', seen=True)]

    response = viewset.list(_request(factory, user))

    assert response.status_code == 200
    item = response.data[0]
    assert set(item.keys()) == {
        'id', 'titulo', 'descripcion', 'fecha_publicacion', 'vigente_hasta',
        'pantalla_nombre', 'pantalla_url', 'tutorial_clave', 'rol_destino',
        'seen', 'is_current',
    }
    assert item['titulo'] == 'Facturar sin lista'
    assert item['seen'] is True
    assert item['is_current'] is True


def test_list_exposes_tutorial_key(factory, viewset, user):
    news = _make_news(1)
    news.tutorial = Tutorial(id=2, clave='bills', titulo='Facturación', descripcion='', seccion='Clientes')
    viewset.repository.items = [news, _make_news(2)]

    response = viewset.list(_request(factory, user))

    assert [item['tutorial_clave'] for item in response.data] == ['bills', None]


def test_list_expired_is_not_current(factory, viewset, user):
    today = timezone.localdate()
    viewset.repository.items = [
        _make_news(1, fecha_publicacion=today - timedelta(days=40), vigente_hasta=today - timedelta(days=10)),
    ]

    response = viewset.list(_request(factory, user))

    assert response.data[0]['is_current'] is False


def test_list_pending_param_is_passed(factory, viewset, user):
    viewset.list(_request(factory, user, data={'pending': 'true'}))
    assert viewset.repository.last_pending is True


def test_list_without_pending_is_history(factory, viewset, user):
    viewset.list(_request(factory, user))
    assert not viewset.repository.last_pending


def test_list_invalid_pending_param(factory, viewset, user):
    with pytest.raises(ValidationError):
        viewset.list(_request(factory, user, data={'pending': 'quizas'}))


def test_list_unexpected_error_returns_500(factory, user):
    repository = Mock(spec=INewsRepository)
    repository.get_visible_for_user.side_effect = Exception('boom')
    viewset = NewsViewSet(repository=repository)

    response = viewset.list(_request(factory, user))

    assert response.status_code == 500
    assert response.data['detail'] == 'Error al obtener las novedades.'


# ------------------------- MARK SEEN -----------------------
def test_mark_seen_ok(factory, viewset, user):
    viewset.repository.items = [_make_news(1)]

    response = viewset.mark_seen(_request(factory, user, method='post', path='/news/1/mark-seen/'), pk=1)

    assert response.status_code == 204


def test_mark_seen_not_found(factory, viewset, user):
    response = viewset.mark_seen(_request(factory, user, method='post', path='/news/9999/mark-seen/'), pk=9999)

    assert response.status_code == 404
    assert response.data['detail'] == 'Novedad no encontrada.'


def test_mark_seen_unexpected_error_returns_500(factory, user):
    service = Mock()
    service.mark_as_seen.side_effect = Exception('boom')
    viewset = NewsViewSet(repository=FakeNewsRepo(), service=service)

    response = viewset.mark_seen(_request(factory, user, method='post', path='/news/1/mark-seen/'), pk=1)

    assert response.status_code == 500
    assert response.data['detail'] == 'Error al marcar la novedad como vista.'


def test_mark_seen_uses_logged_user(factory, user):
    service = Mock()
    viewset = NewsViewSet(repository=FakeNewsRepo(), service=service)

    viewset.mark_seen(_request(factory, user, method='post', path='/news/1/mark-seen/'), pk=1)

    service.mark_as_seen.assert_called_once()
    assert service.mark_as_seen.call_args.args[1] == user
