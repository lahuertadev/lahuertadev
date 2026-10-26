import pytest

from autenticacion.serializers import ProfileUpdateSerializer, UserRegisterSerializer


@pytest.mark.django_db
def test_register_serializer_capitalizes_names():
    serializer = UserRegisterSerializer(data={
        'email': 'nuevo@test.com',
        'username': 'nuevo',
        'first_name': 'juan CARLOS',
        'last_name': 'pérez',
        'password': 'Newtestpass123!',
        'password_confirm': 'Newtestpass123!',
    })
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data['first_name'] == 'Juan Carlos'
    assert serializer.validated_data['last_name'] == 'Pérez'
    # El usuario de login no se toca.
    assert serializer.validated_data['username'] == 'nuevo'


def test_profile_update_serializer_capitalizes_names_and_address():
    serializer = ProfileUpdateSerializer(
        data={'first_name': 'ana', 'last_name': 'DE LA FUENTE', 'address': 'agustín de elía 644'},
        partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data == {
        'first_name': 'Ana',
        'last_name': 'De La Fuente',
        'address': 'Agustín De Elía 644',
    }
