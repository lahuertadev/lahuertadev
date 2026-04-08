from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    """
    Configuración del admin para el modelo Usuario
    """
    list_display = ['email', 'username', 'first_name', 'last_name', 'role', 'email_verified', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['role', 'email_verified', 'is_active', 'is_staff', 'is_superuser', 'date_joined']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['email']
    
    list_display = ['email', 'username', 'first_name', 'last_name', 'role', 'email_verified', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['role', 'email_verified', 'is_active', 'is_staff', 'is_superuser', 'date_joined']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['email']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Información adicional', {'fields': ('role', 'email_verified', 'email_verification_code', 'email_verification_code_expires')}),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Información adicional', {'fields': ('email', 'role')}),
    )
    
    readonly_fields = ['email_verification_code', 'email_verification_code_expires']

