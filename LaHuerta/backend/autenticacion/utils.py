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

