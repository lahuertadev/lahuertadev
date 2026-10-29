import pytest
from unittest.mock import Mock

from django.utils import timezone
from rest_framework.test import APIRequestFactory, APIClient, force_authenticate
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from autenticacion.models import Usuario
from tutorial.constants import TutorialStatus
from tutorial.models import Tutorial, TutorialPaso, TutorialUsuario
from tutorial.views import TutorialViewSet
from tutorial.interfaces import ITutorialRepository


def _make_tutorial(clave='clients', estado=None):
    tutorial = Tutorial(id=1, clave=clave, titulo='Clientes', descripcion='Alta', seccion='Clientes', orden=1)
    tutorial.estado = estado
    return tutorial


class FakeTutorialRepo(ITutorialRepository):
    def __init__(self):
        self.items = []
        self.progress = {}

    def get_visible_for_user(self, user):
        return self.items

    def get_visible_by_key(self, key, user):
        return next((tutorial for tutorial in self.items if tutorial.clave == key), None)

    def get_progress(self, tutorial, user):
        return self.progress.get(tutorial.clave)

    def save_status(self, tutorial, user, status):
        return TutorialUsuario(id=1, tutorial=tutorial, estado=status, fecha=timezone.now())


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def user():
    return Usuario(id=1, username='empleado', role=Usuario.EMPLOYEE)


@pytest.fixture
def viewset():
    return TutorialViewSet(repository=FakeTutorialRepo())


def _request(factory, user, method='get', path='/tutorials/'):
    request = getattr(factory, method)(path)
    force_authenticate(request, user=user)
    return Request(request, parsers=[JSONParser()])


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset, user):
    response = viewset.list(_request(factory, user))

    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_list_response_structure(factory, viewset, user):
    tutorial = Tutorial.objects.create(clave='clients', titulo='Clientes', descripcion='Alta', seccion='Clientes', orden=1)
    TutorialPaso.objects.create(
        tutorial=tutorial, orden=1, ruta='/client', elemento='list-add', titulo='Nuevo cliente',
        descripcion='Tocá Nuevo cliente', avance='route', ruta_destino='/client/create',
    )
    tutorial.estado = TutorialStatus.COMPLETED
    viewset.repository.items = [tutorial]

    response = viewset.list(_request(factory, user))

    assert response.status_code == 200
    item = response.data[0]
    assert set(item.keys()) == {'clave', 'titulo', 'descripcion', 'seccion', 'rol_destino', 'orden', 'estado', 'pasos'}
    assert item['estado'] == 'completado'
    step = item['pasos'][0]
    assert set(step.keys()) == {
        'orden', 'ruta', 'elemento', 'titulo', 'descripcion', 'avance', 'ruta_destino', 'evento',
        'condicion', 'confirmar', 'opcional', 'solo_lectura', 'listo_cuando', 'dispositivo',
    }
    assert step['ruta_destino'] == '/client/create'


def test_list_unexpected_error_returns_500(factory, viewset, user):
    viewset.repository.get_visible_for_user = Mock(side_effect=Exception('boom'))

    response = viewset.list(_request(factory, user))

    assert response.status_code == 500
    assert response.data == {'detail': 'Error al obtener los tutoriales.'}


# ------------------------- ACCIONES ------------------------
@pytest.mark.parametrize('action_name, expected_status', [
    ('start', 'iniciado'),
    ('complete', 'completado'),
    ('skip', 'omitido'),
])
def test_actions_save_status(factory, viewset, user, action_name, expected_status):
    viewset.repository.items = [_make_tutorial()]
    request = _request(factory, user, method='post', path=f'/tutorials/clients/{action_name}/')

    response = getattr(viewset, action_name)(request, pk='clients')

    assert response.status_code == 200
    assert response.data['tutorial_clave'] == 'clients'
    assert response.data['estado'] == expected_status


def test_skip_after_completed_keeps_completed(factory, viewset, user):
    tutorial = _make_tutorial()
    viewset.repository.items = [tutorial]
    viewset.repository.progress = {'clients': TutorialUsuario(tutorial=tutorial, estado=TutorialStatus.COMPLETED, fecha=timezone.now())}
    request = _request(factory, user, method='post', path='/tutorials/clients/skip/')

    response = viewset.skip(request, pk='clients')

    assert response.status_code == 200
    assert response.data['estado'] == 'completado'


def test_action_unknown_tutorial_returns_404(factory, viewset, user):
    request = _request(factory, user, method='post', path='/tutorials/inexistente/start/')

    response = viewset.start(request, pk='inexistente')

    assert response.status_code == 404
    assert response.data == {'detail': 'Tutorial no encontrado.'}


def test_action_unexpected_error_returns_500(factory, user):
    service = Mock()
    service.change_status.side_effect = Exception('boom')
    viewset = TutorialViewSet(repository=FakeTutorialRepo(), service=service)
    request = _request(factory, user, method='post', path='/tutorials/clients/complete/')

    response = viewset.complete(request, pk='clients')

    assert response.status_code == 500
    assert response.data == {'detail': 'Error al guardar el avance del tutorial.'}


# ------------------------- RUTAS ---------------------------
@pytest.mark.django_db
def test_routes_require_authentication():
    assert APIClient().get('/api/tutorials/').status_code in (401, 403)


@pytest.mark.django_db
def test_routes_full_flow():
    Tutorial.objects.create(clave='clients', titulo='Clientes', descripcion='Alta', seccion='Clientes', orden=1)
    user = Usuario.objects.create_user(username='flujo', email='flujo@test.com', password='x', role=Usuario.EMPLOYEE)
    client = APIClient()
    client.force_authenticate(user=user)

    assert client.get('/api/tutorials/').data[0]['estado'] is None
    assert client.post('/api/tutorials/clients/start/').data['estado'] == 'iniciado'
    assert client.post('/api/tutorials/clients/complete/').data['estado'] == 'completado'
    assert client.post('/api/tutorials/clients/skip/').data['estado'] == 'completado'
    assert client.post('/api/tutorials/inexistente/start/').status_code == 404
    assert client.get('/api/tutorials/').data[0]['estado'] == 'completado'
