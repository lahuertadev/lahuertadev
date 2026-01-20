import pytest
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_encode

from autenticacion.repositories import UserRepository
from autenticacion.models import Usuario

#? ==================== FIXTURES ====================

@pytest.fixture
def repository():
    return UserRepository()


@pytest.fixture
def active_user(db):
    return Usuario.objects.create_user(
        email='active@test.com',
        username='active',
        password='Testpass123!',
        role=Usuario.EMPLOYEE,
        is_active=True
    )


@pytest.fixture
def inactive_user(db):
    user = Usuario.objects.create_user(
        email='inactive@test.com',
        username='inactive',
        password='Testpass123!',
        role=Usuario.EMPLOYEE,
        is_active=False
    )
    return user


#? ==================== CREATE USER TESTS ====================

@pytest.mark.django_db
def test_create_user(repository):
    data = {
        'email': 'new@test.com',
        'username': 'newuser',
        'password': 'Testpass123!',
        'first_name': 'Test',
        'last_name': 'User',
        'role': Usuario.EMPLOYEE
    }

    user = repository.create_user(data)

    assert user.email == data['email']
    assert user.username == data['username']
    assert user.check_password(data['password'])
    assert user.first_name == 'Test'
    assert user.last_name == 'User'
    assert user.role == Usuario.EMPLOYEE

#? ==================== AUTHENTICATE USER TESTS ====================

@pytest.mark.django_db
def test_authenticate_success(repository, active_user):
    user = repository.authenticate(
        email=active_user.email,
        password='Testpass123!'
    )

    assert user is not None
    assert user.pk == active_user.pk

@pytest.mark.django_db
def test_authenticate_invalid_password(repository, active_user):
    user = repository.authenticate(
        email=active_user.email,
        password='WrongPassword123!'
    )

    assert user is None

@pytest.mark.django_db
def test_authenticate_inactive_user(repository, inactive_user):
    user = repository.authenticate(
        email=inactive_user.email,
        password='Testpass123!'
    )

    assert user is None

#? ==================== GET USER BY EMAIL TESTS ====================

@pytest.mark.django_db
def test_get_user_by_email_success(repository, active_user):
    user = repository.get_user_by_email(active_user.email)

    assert user is not None
    assert user.pk == active_user.pk

@pytest.mark.django_db
def test_get_user_by_email_inactive(repository, inactive_user):
    user = repository.get_user_by_email(inactive_user.email)

    assert user is None

@pytest.mark.django_db
def test_get_user_by_email_not_found(repository):
    user = repository.get_user_by_email('noexiste@test.com')

    assert user is None


#? ==================== GENERATE PASSWORD RESET TOKEN TESTS ====================

@pytest.mark.django_db
def test_generate_password_reset_token_success(repository, active_user):
    uid, token = repository.generate_password_reset_token(active_user)

    assert uid is not None
    assert token is not None


#? ==================== VALIDATE PASSWORD RESET TOKEN TESTS ====================

@pytest.mark.django_db
def test_validate_password_reset_token_success(repository, active_user):
    uid = urlsafe_base64_encode(force_str(active_user.pk).encode())
    token = default_token_generator.make_token(active_user)

    token_data = {
        'uid': uid,
        'token': token
    }

    user = repository.validate_password_reset_token(token_data)

    assert user is not None
    assert user.pk == active_user.pk

@pytest.mark.django_db
def test_validate_password_reset_token_invalid(repository, active_user):
    uid = urlsafe_base64_encode(force_str(active_user.pk).encode())

    token_data = {
        'uid': uid,
        'token': 'invalid-token'
    }

    user = repository.validate_password_reset_token(token_data)

    assert user is None

@pytest.mark.django_db
def test_validate_password_reset_token_invalid_uid(repository):
    token_data = {
        'uid': 'invalid-uid',
        'token': 'some-token'
    }

    user = repository.validate_password_reset_token(token_data)

    assert user is None

#? ==================== RESET PASSWORD TESTS ====================

@pytest.mark.django_db
def test_reset_password_success(repository, active_user):
    uid = urlsafe_base64_encode(force_str(active_user.pk).encode())
    token = default_token_generator.make_token(active_user)

    token_data = {
        'uid': uid,
        'token': token
    }

    new_password = 'NewPassword123!'

    user = repository.reset_password(token_data, new_password)

    assert user is not None
    user.refresh_from_db()
    assert user.check_password(new_password)

@pytest.mark.django_db
def test_reset_password_invalid_token(repository, active_user):
    uid = urlsafe_base64_encode(force_str(active_user.pk).encode())

    token_data = {
        'uid': uid,
        'token': 'invalid-token'
    }

    user = repository.reset_password(token_data, 'NewPassword123!')

    assert user is None

#? ==================== CHANGE PASSWORD TESTS ====================

@pytest.mark.django_db
def test_change_password_success(repository, active_user):
    result = repository.change_password(
        active_user,
        old_password='Testpass123!',
        new_password='NewPassword123!'
    )

    assert result is True
    active_user.refresh_from_db()
    assert active_user.check_password('NewPassword123!')

@pytest.mark.django_db
def test_change_password_wrong_old_password(repository, active_user):
    result = repository.change_password(
        active_user,
        old_password='WrongPassword123!',
        new_password='NewPassword123!'
    )

    assert result is False
