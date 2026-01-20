import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_str
from rest_framework.test import APIClient
from rest_framework import status
from autenticacion.models import Usuario


# ==================== FIXTURES ====================

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user():
    return Usuario.objects.create_user(
        email='testuser@test.com',
        username='testuser',
        password='Testpass123!',
        role=Usuario.EMPLOYEE
    )


@pytest.fixture
def inactive_user():
    user = Usuario.objects.create_user(
        email='inactive@test.com',
        username='inactive',
        password='Testpass123!',
        role=Usuario.EMPLOYEE
    )
    user.is_active = False
    user.save()
    return user


# ==================== REGISTER VIEW TESTS ====================

@pytest.mark.django_db
def test_register_view_success(api_client):
    """Test de registro exitoso"""
    data = {
        'email': 'newtestuser@test.com',
        'username': 'newtestuser',
        'password': 'Newtestpass123!',
        'password_confirm': 'Newtestpass123!',
        'role': Usuario.EMPLOYEE
    }
    
    response = api_client.post('/auth/register/', data)
    
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['message'] == 'Usuario registrado exitosamente'
    assert Usuario.objects.filter(email=data['email']).exists()
    assert 'user' in response.data


@pytest.mark.django_db
def test_register_view_duplicate_email(api_client, test_user):
    """Test de registro con email duplicado"""
    data = {
        'email': 'testuser@test.com',  # Email ya existe
        'username': 'differentuser',
        'password': 'Newtestpass123!',
        'password_confirm': 'Newtestpass123!',
        'role': Usuario.EMPLOYEE
    }
    
    response = api_client.post('/auth/register/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'email' in response.data


@pytest.mark.django_db
def test_register_view_duplicate_username(api_client, test_user):
    """Test de registro con username duplicado"""
    data = {
        'email': 'different@test.com',
        'username': 'testuser',  # Username ya existe
        'password': 'Newtestpass123!',
        'password_confirm': 'Newtestpass123!',
        'role': Usuario.EMPLOYEE
    }
    
    response = api_client.post('/auth/register/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'username' in response.data


@pytest.mark.django_db
def test_register_view_weak_password(api_client):
    """Test de registro con contraseña débil"""
    data = {
        'email': 'newuser@test.com',
        'username': 'newuser',
        'password': 'weak', 
        'password_confirm': 'weak',
        'role': Usuario.EMPLOYEE
    }
    
    response = api_client.post('/auth/register/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'password' in response.data


@pytest.mark.django_db
def test_register_view_password_mismatch(api_client):
    """Test de registro con contraseñas que no coinciden"""
    data = {
        'email': 'newuser@test.com',
        'username': 'newuser',
        'password': 'Newtestpass123!',
        'password_confirm': 'Differentpass123!',
        'role': Usuario.EMPLOYEE
    }
    
    response = api_client.post('/auth/register/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'password' in response.data


@pytest.mark.django_db
def test_register_view_missing_fields(api_client):
    """Test de registro con campos faltantes"""
    data = {
        'email': 'newuser@test.com',
    }
    
    response = api_client.post('/auth/register/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ==================== LOGIN VIEW TESTS ====================

@pytest.mark.django_db
def test_login_view_success(api_client, test_user):
    """Test de login exitoso"""
    data = {
        'email': 'testuser@test.com',
        'password': 'Testpass123!'
    }
    
    response = api_client.post('/auth/login/', data)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data['message'] == 'Login exitoso'
    assert 'user' in response.data
    assert response.data['user']['email'] == 'testuser@test.com'


@pytest.mark.django_db
def test_login_view_invalid_credentials(api_client, test_user):
    data = {
        'email': 'testuser@test.com',
        'password': 'WrongPassword123!'
    }

    response = api_client.post('/auth/login/', data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'non_field_errors' in response.data
    assert response.data['non_field_errors'][0] == 'Credenciales inválidas.'


@pytest.mark.django_db
def test_login_view_inactive_user(api_client, inactive_user):
    data = {
        'email': 'inactive@test.com',
        'password': 'Testpass123!'
    }

    response = api_client.post('/auth/login/', data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'non_field_errors' in response.data
    assert response.data['non_field_errors'][0] == 'Credenciales inválidas.'


@pytest.mark.django_db
def test_login_view_nonexistent_email(api_client):
    data = {
        'email': 'nonexistent@test.com',
        'password': 'Testpass123!'
    }

    response = api_client.post('/auth/login/', data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'non_field_errors' in response.data
    assert response.data['non_field_errors'][0] == 'Credenciales inválidas.'


@pytest.mark.django_db
def test_login_view_missing_fields(api_client):
    """Test de login con campos faltantes"""
    data = {
        'email': 'testuser@test.com'
    }
    
    response = api_client.post('/auth/login/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ==================== LOGOUT VIEW TESTS ====================
@pytest.mark.django_db
def test_logout_view_success(api_client, test_user):
    """
    Logout exitoso cuando el usuario está autenticado
    """
    api_client.force_authenticate(user=test_user)

    response = api_client.post('/auth/logout/')

    assert response.status_code == status.HTTP_200_OK
    assert response.data['message'] == 'Cierre de sesión exitoso'

@pytest.mark.django_db
def test_logout_view_unauthorized(api_client):
    """
    Logout sin estar autenticado debe devolver 403
    """
    response = api_client.post('/auth/logout/')

    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_logout_invalidates_session(api_client, test_user):
    """
    Después del logout, el usuario ya no está autenticado
    """
    api_client.force_authenticate(user=test_user)

    response = api_client.post('/auth/logout/')
    assert response.status_code == status.HTTP_200_OK

    new_client = APIClient()

    response = new_client.post('/auth/logout/')
    assert response.status_code == status.HTTP_403_FORBIDDEN

# ==================== PASSWORD RESET REQUEST VIEW TESTS ====================

@pytest.mark.django_db
@patch('autenticacion.views.send_password_reset_email')
def test_password_reset_request_success(mock_send_email, api_client, test_user):
    """Test de solicitud de reset exitosa"""
    data = {
        'email': 'testuser@test.com'
    }
    
    response = api_client.post('/auth/password-reset/', data)
    
    assert response.status_code == status.HTTP_200_OK
    assert 'message' in response.data
    mock_send_email.assert_called_once()


@pytest.mark.django_db
@patch('autenticacion.views.send_password_reset_email')
def test_password_reset_request_nonexistent_email(mock_send_email, api_client):
    """Test de solicitud de reset con email que no existe (por seguridad retorna éxito)"""
    data = {
        'email': 'nonexistent@test.com'
    }
    
    response = api_client.post('/auth/password-reset/', data)
    
    assert response.status_code == status.HTTP_200_OK
    assert 'message' in response.data
    mock_send_email.assert_not_called()


@pytest.mark.django_db
def test_password_reset_request_invalid_email(api_client):
    """Test de solicitud de reset con email inválido"""
    data = {
        'email': 'invalid-email'
    }
    
    response = api_client.post('/auth/password-reset/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'email' in response.data


@pytest.mark.django_db
def test_password_reset_request_missing_email(api_client):
    """Test de solicitud de reset sin email"""
    data = {}
    
    response = api_client.post('/auth/password-reset/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ==================== PASSWORD RESET CONFIRM VIEW TESTS ====================

@pytest.mark.django_db
def test_password_reset_confirm_success(api_client, test_user):
    """Test de confirmación de reset exitosa"""
    uid = urlsafe_base64_encode(force_str(test_user.pk).encode())
    token = default_token_generator.make_token(test_user)
    
    data = {
        'uid': uid,
        'token': token,
        'new_password': 'NewPassword123!',
        'new_password_confirm': 'NewPassword123!'
    }
    
    response = api_client.post('/auth/password-reset-confirm/', data)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data['message'] == 'Contraseña restablecida exitosamente.'
    
    # Verificar que la contraseña cambió
    test_user.refresh_from_db()
    assert test_user.check_password('NewPassword123!')


@pytest.mark.django_db
def test_password_reset_confirm_invalid_token(api_client, test_user):
    """Test de confirmación con token inválido"""
    uid = urlsafe_base64_encode(force_str(test_user.pk).encode())
    
    data = {
        'uid': uid,
        'token': 'invalid-token',
        'new_password': 'NewPassword123!',
        'new_password_confirm': 'NewPassword123!'
    }
    
    response = api_client.post('/auth/password-reset-confirm/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data['detail'] == 'Token inválido o expirado.'


@pytest.mark.django_db
def test_password_reset_confirm_invalid_uid(api_client):
    """Test de confirmación con uid inválido"""
    data = {
        'uid': 'invalid-uid',
        'token': 'some-token',
        'new_password': 'NewPassword123!',
        'new_password_confirm': 'NewPassword123!'
    }
    
    response = api_client.post('/auth/password-reset-confirm/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_password_reset_confirm_weak_password(api_client, test_user):
    """Test de confirmación con contraseña débil"""
    uid = urlsafe_base64_encode(force_str(test_user.pk).encode())
    token = default_token_generator.make_token(test_user)
    
    data = {
        'uid': uid,
        'token': token,
        'new_password': 'weak',
        'new_password_confirm': 'weak'
    }
    
    response = api_client.post('/auth/password-reset-confirm/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'new_password' in response.data


@pytest.mark.django_db
def test_password_reset_confirm_password_mismatch(api_client, test_user):
    """Test de confirmación con contraseñas que no coinciden"""
    uid = urlsafe_base64_encode(force_str(test_user.pk).encode())
    token = default_token_generator.make_token(test_user)
    
    data = {
        'uid': uid,
        'token': token,
        'new_password': 'NewPassword123!',
        'new_password_confirm': 'DifferentPassword123!'
    }
    
    response = api_client.post('/auth/password-reset-confirm/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'new_password' in response.data


@pytest.mark.django_db
def test_password_reset_confirm_missing_fields(api_client):
    """Test de confirmación con campos faltantes"""
    data = {
        'uid': 'some-uid',
    }
    
    response = api_client.post('/auth/password-reset-confirm/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ==================== PASSWORD CHANGE VIEW TESTS ====================

@pytest.mark.django_db
def test_password_change_success(api_client, test_user):
    """Test de cambio de contraseña exitoso"""
    api_client.force_authenticate(user=test_user)
    
    data = {
        'old_password': 'Testpass123!',
        'new_password': 'NewPassword123!',
        'new_password_confirm': 'NewPassword123!'
    }
    
    response = api_client.post('/auth/password-change/', data)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data['message'] == 'Contraseña cambiada exitosamente.'
    
    test_user.refresh_from_db()
    assert test_user.check_password('NewPassword123!')


@pytest.mark.django_db
def test_password_change_unauthorized(api_client):
    """Test de cambio de contraseña sin autenticación"""
    data = {
            'old_password': 'OldPassword123!',
            'new_password': 'NewPassword123!',
            'new_password_confirm': 'NewPassword123!'
        }

    response = api_client.post('/auth/password-change/', data)

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_password_change_wrong_old_password(api_client, test_user):
    """Test de cambio de contraseña con contraseña actual incorrecta"""
    api_client.force_authenticate(user=test_user)
    
    data = {
        'old_password': 'WrongPassword123!',
        'new_password': 'NewPassword123!',
        'new_password_confirm': 'NewPassword123!'
    }
    
    response = api_client.post('/auth/password-change/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data['detail'] == 'La contraseña actual es incorrecta.'


@pytest.mark.django_db
def test_password_change_weak_new_password(api_client, test_user):
    """Test de cambio de contraseña con contraseña nueva débil"""
    api_client.force_authenticate(user=test_user)
    
    data = {
        'old_password': 'Testpass123!',
        'new_password': 'weak',
        'new_password_confirm': 'weak'
    }
    
    response = api_client.post('/auth/password-change/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'new_password' in response.data


@pytest.mark.django_db
def test_password_change_password_mismatch(api_client, test_user):
    """Test de cambio de contraseña con contraseñas que no coinciden"""
    api_client.force_authenticate(user=test_user)
    
    data = {
        'old_password': 'Testpass123!',
        'new_password': 'NewPassword123!',
        'new_password_confirm': 'DifferentPassword123!'
    }
    
    response = api_client.post('/auth/password-change/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'new_password' in response.data


@pytest.mark.django_db
def test_password_change_missing_fields(api_client, test_user):
    """Test de cambio de contraseña con campos faltantes"""
    api_client.force_authenticate(user=test_user)
    
    data = {
        'old_password': 'Testpass123!',
        # Falta new_password
    }
    
    response = api_client.post('/auth/password-change/', data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ==================== CSRF VIEW TESTS ====================

def test_csrf_view_success(api_client):
    """Test de obtención de token CSRF exitoso"""
    response = api_client.get('/auth/csrf/')
    
    assert response.status_code == status.HTTP_200_OK
    assert 'csrfToken' in response.data
    assert response.data['csrfToken'] is not None