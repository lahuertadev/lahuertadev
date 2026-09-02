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
    assert user.is_active is False

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

#? ==================== GET USER BY EMAIL ANY STATUS TESTS ====================

@pytest.mark.django_db
def test_get_user_by_email_any_status_finds_active(repository, active_user):
    user = repository.get_user_by_email_any_status(active_user.email)

    assert user is not None
    assert user.pk == active_user.pk

@pytest.mark.django_db
def test_get_user_by_email_any_status_finds_inactive(repository, inactive_user):
    user = repository.get_user_by_email_any_status(inactive_user.email)

    assert user is not None
    assert user.pk == inactive_user.pk

@pytest.mark.django_db
def test_get_user_by_email_any_status_not_found(repository):
    user = repository.get_user_by_email_any_status('noexiste@test.com')

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

#? ==================== GET ALL USERS TESTS ====================

@pytest.mark.django_db
def test_get_all_users_includes_inactive(repository, active_user, inactive_user):
    users = repository.get_all_users()

    ids = [user.id for user in users]
    assert active_user.id in ids
    assert inactive_user.id in ids

#? ==================== GET USER BY ID TESTS ====================

@pytest.mark.django_db
def test_get_user_by_id_success(repository, active_user):
    user = repository.get_user_by_id(active_user.id)

    assert user is not None
    assert user.pk == active_user.pk

@pytest.mark.django_db
def test_get_user_by_id_includes_inactive(repository, inactive_user):
    user = repository.get_user_by_id(inactive_user.id)

    assert user is not None
    assert user.pk == inactive_user.pk

@pytest.mark.django_db
def test_get_user_by_id_not_found(repository):
    user = repository.get_user_by_id(999999)

    assert user is None

#? ==================== SET ACTIVE STATUS TESTS ====================

@pytest.mark.django_db
def test_set_active_status_disable(repository, active_user):
    user = repository.set_active_status(active_user.id, False)

    assert user is not None
    assert user.is_active is False
    active_user.refresh_from_db()
    assert active_user.is_active is False

@pytest.mark.django_db
def test_set_active_status_enable(repository, inactive_user):
    user = repository.set_active_status(inactive_user.id, True)

    assert user is not None
    assert user.is_active is True
    inactive_user.refresh_from_db()
    assert inactive_user.is_active is True

@pytest.mark.django_db
def test_set_active_status_not_found(repository):
    user = repository.set_active_status(999999, False)

    assert user is None

@pytest.mark.django_db
def test_set_active_status_stamps_approved_at_on_first_decision(repository, db):
    pending_user = Usuario.objects.create_user(
        email='pending-repo@test.com',
        username='pendingrepo',
        password='Testpass123!',
        role=Usuario.EMPLOYEE,
        is_active=False
    )
    assert pending_user.approved_at is None

    user = repository.set_active_status(pending_user.id, False)

    assert user.is_active is False
    assert user.approved_at is not None

@pytest.mark.django_db
def test_set_active_status_does_not_overwrite_existing_approved_at(repository, active_user):
    first_call = repository.set_active_status(active_user.id, False)
    first_approved_at = first_call.approved_at
    assert first_approved_at is not None

    second_call = repository.set_active_status(active_user.id, True)

    assert second_call.approved_at == first_approved_at

#? ==================== SET USER ROLE TESTS ====================

@pytest.mark.django_db
def test_set_user_role_success(repository, active_user):
    user = repository.set_user_role(active_user.id, Usuario.ADMINISTRATOR)

    assert user is not None
    assert user.role == Usuario.ADMINISTRATOR
    active_user.refresh_from_db()
    assert active_user.role == Usuario.ADMINISTRATOR

@pytest.mark.django_db
def test_set_user_role_not_found(repository):
    user = repository.set_user_role(999999, Usuario.ADMINISTRATOR)

    assert user is None

#? ==================== UPDATE PROFILE TESTS ====================

@pytest.mark.django_db
def test_update_profile_updates_given_fields(repository, active_user):
    user = repository.update_profile(active_user, {
        'first_name': 'Nuevo',
        'address': 'Calle Falsa 123',
    })

    assert user.first_name == 'Nuevo'
    assert user.address == 'Calle Falsa 123'
    active_user.refresh_from_db()
    assert active_user.first_name == 'Nuevo'
    assert active_user.address == 'Calle Falsa 123'

@pytest.mark.django_db
def test_update_profile_ignores_unset_fields(repository, active_user):
    active_user.last_name = 'Original'
    active_user.save()

    user = repository.update_profile(active_user, {'first_name': 'Nuevo'})

    assert user.last_name == 'Original'

#? ==================== SET AVATAR TESTS ====================

@pytest.mark.django_db
def test_set_avatar_updates_field(repository, active_user):
    from io import BytesIO
    from PIL import Image
    from django.core.files.uploadedfile import SimpleUploadedFile

    buffer = BytesIO()
    Image.new('RGB', (10, 10)).save(buffer, format='PNG')
    buffer.seek(0)
    avatar = SimpleUploadedFile('avatar.png', buffer.read(), content_type='image/png')

    user = repository.set_avatar(active_user, avatar)

    assert bool(user.avatar)
    active_user.refresh_from_db()
    assert bool(active_user.avatar)

#? ==================== GET SUPERUSERS TESTS ====================

@pytest.mark.django_db
def test_get_superusers_returns_only_active_superusers(repository, active_user, inactive_user):
    active_superuser = Usuario.objects.create_user(
        email='super@test.com',
        username='super',
        password='Testpass123!',
        role=Usuario.SUPERUSER,
        is_active=True
    )
    Usuario.objects.create_user(
        email='inactivesuper@test.com',
        username='inactivesuper',
        password='Testpass123!',
        role=Usuario.SUPERUSER,
        is_active=False
    )

    superusers = list(repository.get_superusers())

    assert superusers == [active_superuser]

@pytest.mark.django_db
def test_get_superusers_empty_when_none_exist(repository, active_user):
    superusers = list(repository.get_superusers())

    assert superusers == []
    active_user.avatar.delete(save=False)
