import pytest
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request
from rest_framework.parsers import JSONParser
from django.contrib.auth import get_user_model
from autenticacion.permissions import IsAdministratorOrReadOnly, IsSuperuserOrReadOnly, RoleBasedPermission
from tipo_condicion_iva.views import ConditionIvaTypeViewSet

Usuario = get_user_model()


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def superuser():
    return Usuario.objects.create_user(
        email='superuser@test.com',
        username='superuser',
        password='testpass123',
        role=Usuario.SUPERUSER
    )


@pytest.fixture
def administrator():
    return Usuario.objects.create_user(
        email='admin@test.com',
        username='admin',
        password='testpass123',
        role=Usuario.ADMINISTRATOR
    )


@pytest.fixture
def employee():
    return Usuario.objects.create_user(
        email='employee@test.com',
        username='employee',
        password='testpass123',
        role=Usuario.EMPLOYEE
    )


@pytest.fixture
def viewset():
    return ConditionIvaTypeViewSet()


# ============================================================================
# Tests para IsAdministratorOrReadOnly
# ============================================================================

@pytest.mark.django_db
def test_administrator_can_read(factory, viewset, administrator):
    """Administrador puede leer (GET)"""
    request = factory.get('/type_condition_iva/')
    force_authenticate(request, user=administrator)
    drf_request = Request(request, parsers=[JSONParser()])
    
    permission = IsAdministratorOrReadOnly()
    assert permission.has_permission(drf_request, viewset) == True


@pytest.mark.django_db
def test_administrator_can_create(factory, viewset, administrator):
    """Administrador puede crear (POST)"""
    request = factory.post('/type_condition_iva/', {'descripcion': 'Test'}, format='json')
    force_authenticate(request, user=administrator)
    drf_request = Request(request, parsers=[JSONParser()])
    
    permission = IsAdministratorOrReadOnly()
    assert permission.has_permission(drf_request, viewset) == True


@pytest.mark.django_db
def test_employee_can_read(factory, viewset, employee):
    """Empleado puede leer (GET)"""
    request = factory.get('/type_condition_iva/')
    force_authenticate(request, user=employee)
    drf_request = Request(request, parsers=[JSONParser()])
    
    permission = IsAdministratorOrReadOnly()
    assert permission.has_permission(drf_request, viewset) == True


@pytest.mark.django_db
def test_employee_cannot_create(factory, viewset, employee):
    """Empleado NO puede crear (POST)"""
    request = factory.post('/type_condition_iva/', {'descripcion': 'Test'}, format='json')
    force_authenticate(request, user=employee)
    drf_request = Request(request, parsers=[JSONParser()])
    
    permission = IsAdministratorOrReadOnly()
    assert permission.has_permission(drf_request, viewset) == False


@pytest.mark.django_db
def test_superuser_can_create(factory, viewset, superuser):
    """Superusuario puede crear (POST)"""
    request = factory.post('/type_condition_iva/', {'descripcion': 'Test'}, format='json')
    force_authenticate(request, user=superuser)
    drf_request = Request(request, parsers=[JSONParser()])
    
    permission = IsAdministratorOrReadOnly()
    assert permission.has_permission(drf_request, viewset) == True


@pytest.mark.django_db
def test_unauthenticated_cannot_access(factory, viewset):
    """Usuario no autenticado NO puede acceder"""
    request = factory.get('/type_condition_iva/')
    drf_request = Request(request, parsers=[JSONParser()])
    
    permission = IsAdministratorOrReadOnly()
    assert permission.has_permission(drf_request, viewset) == False


# ============================================================================
# Tests para IsSuperuserOrReadOnly
# ============================================================================

@pytest.mark.django_db
def test_superuser_only_can_write(factory, viewset, superuser, administrator):
    """Solo superusuario puede escribir con IsSuperuserOrReadOnly"""
    permission = IsSuperuserOrReadOnly()
    
    # Superuser puede escribir
    request = factory.post('/type_condition_iva/', {'descripcion': 'Test'}, format='json')
    force_authenticate(request, user=superuser)
    drf_request = Request(request, parsers=[JSONParser()])
    assert permission.has_permission(drf_request, viewset) == True
    
    # Administrador NO puede escribir
    request = factory.post('/type_condition_iva/', {'descripcion': 'Test'}, format='json')
    force_authenticate(request, user=administrator)
    drf_request = Request(request, parsers=[JSONParser()])
    assert permission.has_permission(drf_request, viewset) == False


# ============================================================================
# Tests de integración con ViewSet
# ============================================================================

@pytest.mark.django_db
def test_viewset_list_allows_authenticated(factory, viewset, employee):
    """ViewSet permite listar a usuarios autenticados"""
    request = factory.get('/type_condition_iva/')
    force_authenticate(request, user=employee)
    drf_request = Request(request, parsers=[JSONParser()])
    
    response = viewset.list(drf_request)
    assert response.status_code == 200


@pytest.mark.django_db
def test_viewset_create_allows_administrator(factory, viewset, administrator):
    """ViewSet permite crear a administradores"""
    request = factory.post(
        '/type_condition_iva/',
        {'descripcion': 'Test IVA'},
        format='json'
    )
    force_authenticate(request, user=administrator)
    drf_request = Request(request, parsers=[JSONParser()])
    
    response = viewset.create(drf_request)
    # Si tiene permiso, debería intentar crear (puede fallar por validación, pero no por permiso)
    assert response.status_code in [201, 400]  # 201 creado, 400 error de validación


@pytest.mark.django_db
def test_viewset_create_denies_employee(factory, viewset, employee):
    """ViewSet NO permite crear a empleados"""
    request = factory.post(
        '/type_condition_iva/',
        {'descripcion': 'Test IVA'},
        format='json'
    )
    force_authenticate(request, user=employee)
    drf_request = Request(request, parsers=[JSONParser()])
    
    # El permiso debería bloquear antes de llegar al método create
    permission = IsAdministratorOrReadOnly()
    has_permission = permission.has_permission(drf_request, viewset)
    assert has_permission == False

