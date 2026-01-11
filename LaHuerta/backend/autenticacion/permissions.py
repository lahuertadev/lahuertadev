from rest_framework import permissions
from .models import Usuario


class IsSuperuserOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado: Solo superusuarios pueden crear/editar/eliminar.
    Otros usuarios solo pueden leer.
    """
    def has_permission(self, request, view):
        # Permitir lectura a todos los usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Solo superusuarios pueden escribir
        return request.user and request.user.is_authenticated and request.user.role == Usuario.SUPERUSER


class IsAdministratorOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado: Administradores y superusuarios pueden crear/editar/eliminar.
    Empleados solo pueden leer.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [Usuario.SUPERUSER, Usuario.ADMINISTRATOR]
        )


class RoleBasedPermission(permissions.BasePermission):
    """
    Permiso genérico basado en roles.
    Permite configurar qué roles pueden realizar qué acciones.
    """
    # Definir qué roles pueden hacer qué
    allowed_roles_for_read = [Usuario.SUPERUSER, Usuario.ADMINISTRATOR, Usuario.EMPLOYEE]
    allowed_roles_for_write = [Usuario.SUPERUSER, Usuario.ADMINISTRATOR]
    allowed_roles_for_delete = [Usuario.SUPERUSER]
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = request.user.role
        
        # Métodos de lectura (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return user_role in self.allowed_roles_for_read
        
        # Métodos de escritura (POST, PUT, PATCH)
        if request.method in ['POST', 'PUT', 'PATCH']:
            return user_role in self.allowed_roles_for_write
        
        # Métodos de eliminación (DELETE)
        if request.method == 'DELETE':
            return user_role in self.allowed_roles_for_delete
        
        return False


class HasRolePermission(permissions.BasePermission):
    """
    Permiso que verifica si el usuario tiene un rol específico.
    Se puede usar con @permission_classes([HasRolePermission(roles=[Usuario.SUPERUSER])])
    """
    def __init__(self, roles=None):
        self.roles = roles or []
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.roles

