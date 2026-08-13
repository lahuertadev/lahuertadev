import re
import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import date, timedelta
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


def send_welcome_email_with_verification_code(user, verification_code):
    """
    Envía un email de bienvenida con el código de verificación de email
    
    Args:
        user: Instancia del usuario recién registrado
        verification_code: Código de verificación de 6 dígitos
    """
    user_name = user.first_name or user.username
    
    subject = '¡Bienvenido a La Huerta! 🎉'
    
    message = f"""
¡Hola {user_name}!

Te damos la bienvenida a La Huerta. Estamos muy contentos de que te hayas unido a nuestra plataforma.

Para completar tu registro y activar tu cuenta, necesitamos verificar tu dirección de email.

Tu código de verificación es: {verification_code}

Este código expirará en 24 horas por seguridad.

Si no te registraste en La Huerta, puedes ignorar este email.

¡Esperamos que disfrutes usando nuestra plataforma!

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
        print(f"Error al enviar email de bienvenida: {e}")
        return False


# ==================== FUNCIONES DE VERIFICACIÓN DE EMAIL ====================

def generate_verification_code():
    """
    Genera un código numérico de 6 dígitos
    
    Returns:
        str: Código de verificación de 6 dígitos
    """
    return ''.join(random.choices(string.digits, k=6))


def create_verification_code_for_user(user):
    """
    Genera un nuevo código de verificación de 6 dígitos y lo guarda en el usuario.
    Si ya existe un código, lo reemplaza.
    
    Args:
        user: Instancia del usuario
    
    Returns:
        str: El código de verificación generado
    """
    code = generate_verification_code()
    user.email_verification_code = code
    user.email_verification_code_expires = timezone.now() + timedelta(hours=24)  # Expira en 24 horas
    user.save()
    return code


def is_verification_code_valid(user, code):
    """
    Verifica si el código proporcionado es válido (coincide y no está expirado)
    
    Args:
        user: Instancia del usuario
        code: Código a verificar
    
    Returns:
        bool: True si el código es válido, False en caso contrario
    """
    if not user.email_verification_code:
        return False
    if user.email_verification_code != code:
        return False
    if not user.email_verification_code_expires:
        return False
    if timezone.now() > user.email_verification_code_expires:
        return False
    return True


def is_verification_code_expired(user):
    """
    Verifica si el código actual está expirado
    
    Args:
        user: Instancia del usuario
    
    Returns:
        bool: True si el código está expirado o no existe, False si es válido
    """
    if not user.email_verification_code or not user.email_verification_code_expires:
        return True
    return timezone.now() > user.email_verification_code_expires


def verify_user_email(user, code):
    """
    Verifica el email con el código proporcionado.
    Retorna True si fue exitoso, False si el código es inválido.
    Si es exitoso, limpia el código y marca el email como verificado.
    
    Args:
        user: Instancia del usuario
        code: Código de verificación
    
    Returns:
        bool: True si la verificación fue exitosa, False en caso contrario
    """
    if is_verification_code_valid(user, code):
        user.email_verified = True
        user.email_verification_code = None
        user.email_verification_code_expires = None
        user.save()
        return True
    return False


# ==================== CUMPLEAÑOS Y ANIVERSARIOS LABORALES ====================

CELEBRATIONS_WINDOW_DAYS = 7


def _next_occurrence(month, day, today):
    """
    Próxima fecha (a partir de hoy, inclusive) en la que se repite un mes/día
    dado (cumpleaños, aniversario). Si el 29 de febrero cae en un año no
    bisiesto, se usa el 28 de febrero como aproximación.
    """
    try:
        candidate = date(today.year, month, day)
    except ValueError:
        candidate = date(today.year, 2, 28)

    if candidate < today:
        try:
            candidate = date(today.year + 1, month, day)
        except ValueError:
            candidate = date(today.year + 1, 2, 28)

    return candidate


def get_upcoming_celebrations(users, within_days=CELEBRATIONS_WINDOW_DAYS):
    """
    A partir de una lista de usuarios, arma los cumpleaños (birth_date) y
    aniversarios laborales (date_joined) que caen hoy o dentro de los
    próximos `within_days` días. No expone el año de nacimiento: solo
    cuántos días faltan.

    Retorna una lista de dicts ordenada por días restantes:
        {user_id, first_name, last_name, type: 'birthday'|'anniversary', days_until, years}
    'years' solo está presente en las entradas de tipo 'anniversary'.
    """
    today = timezone.localdate()
    celebrations = []

    for user in users:
        if user.birth_date:
            next_date = _next_occurrence(user.birth_date.month, user.birth_date.day, today)
            days_until = (next_date - today).days
            if days_until <= within_days:
                celebrations.append({
                    'user_id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'type': 'birthday',
                    'days_until': days_until,
                })

        if user.date_joined:
            join_date = timezone.localtime(user.date_joined).date()
            next_date = _next_occurrence(join_date.month, join_date.day, today)
            days_until = (next_date - today).days
            years = next_date.year - join_date.year
            if years >= 1 and days_until <= within_days:
                celebrations.append({
                    'user_id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'type': 'anniversary',
                    'days_until': days_until,
                    'years': years,
                })

    celebrations.sort(key=lambda c: c['days_until'])
    return celebrations

