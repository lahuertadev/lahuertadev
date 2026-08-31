from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils import timezone
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
            role=data.get('role', Usuario.EMPLOYEE),
            is_active=False
        )

    def authenticate(self, email, password, request=None):
        return authenticate(
            request=request,
            username=email,
            password=password
        )

    def get_user_by_email(self, email):
        """Obtiene un usuario activo por su email"""
        try:
            return Usuario.objects.get(email=email, is_active=True)
        except Usuario.DoesNotExist:
            return None

    def get_user_by_email_any_status(self, email):
        """
        Obtiene un usuario por su email sin filtrar por estado activo.
        Usado en verificación de email, donde el usuario todavía está
        pendiente de aprobación (is_active=False) al momento de verificar.
        """
        try:
            return Usuario.objects.get(email=email)
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

    def get_all_users(self):
        """Obtiene todos los usuarios, incluyendo deshabilitados"""
        return Usuario.objects.all().order_by('-date_joined')

    def get_user_by_id(self, user_id):
        """Obtiene un usuario por su id, incluyendo deshabilitados"""
        return Usuario.objects.filter(pk=user_id).first()

    def get_active_users(self):
        """Obtiene los usuarios habilitados"""
        return Usuario.objects.filter(is_active=True)

    def get_superusers(self):
        """Obtiene los superusuarios activos, para notificaciones administrativas"""
        return Usuario.objects.filter(role=Usuario.SUPERUSER, is_active=True)

    def set_active_status(self, user_id, is_active):
        """
        Habilita o deshabilita un usuario. Retorna el usuario actualizado o None si no existe.
        La primera vez que un superusuario decide el estado de un usuario (lo active o
        lo rechace) se marca approved_at, para distinguir "pendiente de aprobación"
        (approved_at=None) de "inactivo" (ya fue revisado, pero está deshabilitado).
        """
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        user.is_active = is_active
        if not user.approved_at:
            user.approved_at = timezone.now()
        user.save()
        return user

    def set_user_role(self, user_id, role):
        """Cambia el rol de un usuario. Retorna el usuario actualizado o None si no existe"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        user.role = role
        user.save()
        return user

    def update_profile(self, user, data):
        """Actualiza los datos personales del propio usuario (self-service)"""
        for field in ['first_name', 'last_name', 'birth_date', 'address', 'phone']:
            if field in data:
                setattr(user, field, data[field])
        user.save()
        return user

    def set_avatar(self, user, avatar_file):
        """Reemplaza la foto de perfil del usuario autenticado"""
        user.avatar = avatar_file
        user.save()
        return user
