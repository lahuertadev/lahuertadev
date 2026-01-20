from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.db import transaction
from .models import Usuario
from .interfaces import IUserRepository

class UserRepository(IUserRepository):

    def create_user(self, data):
        return Usuario.objects.create_user(
            email=data['email'],
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            role=data.get('role', Usuario.EMPLOYEE)
        )

    def authenticate(self, email, password, request=None):
        return authenticate(
            request=request,
            username=email,
            password=password
        )

    def get_user_by_email(self, email):
        """Obtiene un usuario por su email"""
        try:
            return Usuario.objects.get(email=email, is_active=True)
        except Usuario.DoesNotExist:
            return None

    def generate_password_reset_token(self, user):
        """
        Genera un token seguro para reset de contraseña
        Retorna: (uid, token) donde uid es el ID del usuario codificado
        """
        uid = urlsafe_base64_encode(force_str(user.pk).encode())
        token = default_token_generator.make_token(user)
        return uid, token

    def validate_password_reset_token(self, token_data):
        """
        Valida el token de reset de contraseña
        token_data: dict con 'uid' y 'token'
        Retorna: Usuario si el token es válido, None si no
        """
        try:
            uid = force_str(urlsafe_base64_decode(token_data['uid']))
            user = Usuario.objects.get(pk=uid, is_active=True)
            
            if default_token_generator.check_token(user, token_data['token']):
                return user
            return None
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            return None

    @transaction.atomic
    def reset_password(self, token_data, new_password):
        """
        Resetea la contraseña del usuario usando el token
        Retorna: Usuario si fue exitoso, None si el token es inválido
        """
        user = self.validate_password_reset_token(token_data)
        if user:
            user.set_password(new_password)
            user.save()
            return user
        return None

    def change_password(self, user, old_password, new_password):
        """
        Cambia la contraseña del usuario autenticado
        Retorna: True si fue exitoso, False si la contraseña actual es incorrecta
        """
        if not user.check_password(old_password):
            return False
        
        user.set_password(new_password)
        user.save()
        return True
