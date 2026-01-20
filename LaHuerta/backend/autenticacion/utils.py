import re
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import serializers
from .models import Usuario


def user_has_role(user, role):
    """
    Verifica si un usuario tiene un rol específico
    """
    if not user or not user.is_authenticated:
        return False
    return user.role == role


def user_can_create(user):
    """
    Verifica si un usuario puede crear recursos
    """
    return user_has_role(user, Usuario.SUPERUSER) or user_has_role(user, Usuario.ADMINISTRATOR)


def user_can_delete(user):
    """
    Verifica si un usuario puede eliminar recursos
    """
    return user_has_role(user, Usuario.SUPERUSER)


def user_can_edit(user):
    """
    Verifica si un usuario puede editar recursos
    """
    return user_has_role(user, Usuario.SUPERUSER) or user_has_role(user, Usuario.ADMINISTRATOR)


def get_user_permissions(user):
    """
    Retorna un diccionario con los permisos del usuario basados en su rol
    """
    if not user or not user.is_authenticated:
        return {
            'can_read': False,
            'can_create': False,
            'can_edit': False,
            'can_delete': False,
        }
    
    return {
        'can_read': True,  # Todos los usuarios autenticados pueden leer
        'can_create': user_can_create(user),
        'can_edit': user_can_edit(user),
        'can_delete': user_can_delete(user),
        'role': user.role,
    }


def validate_password_strength(value):
    errors = []
    
    if len(value) < 8:
        errors.append("La contraseña debe tener al menos 8 caracteres.")
    
    if not re.search(r'[A-Z]', value):
        errors.append("La contraseña debe contener al menos una letra mayúscula.")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        errors.append("La contraseña debe contener al menos un carácter especial (!@#$%^&*(),.?\":{}|<>)")
    
    if not re.search(r'[0-9]', value):
        errors.append("La contraseña debe contener al menos un número.")
    
    if errors:
        raise serializers.ValidationError(errors)
    
    return value


def send_password_reset_email(user, uid, token):
    """
    Envía un email con el token de recuperación de contraseña
    
    Args:
        user: Instancia del usuario
        uid: ID del usuario codificado en base64
        token: Token de recuperación
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"
    
    subject = 'Recuperación de contraseña - La Huerta'
    
    message = f"""
Hola {user.first_name or user.username},

Has solicitado restablecer tu contraseña en La Huerta.

Para restablecer tu contraseña, haz clic en el siguiente enlace:
{reset_url}

Si no solicitaste este cambio, puedes ignorar este email.

Este enlace expirará en 3 días por seguridad.

Saludos,
Equipo de La Huerta
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        # En desarrollo, imprime el error en consola
        print(f"Error al enviar email: {e}")
        return False

