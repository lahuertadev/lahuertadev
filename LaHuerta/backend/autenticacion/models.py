from django.db import models
from django.contrib.auth.models import AbstractUser

class Usuario(AbstractUser):
    SUPERUSER = 'superuser'
    ADMINISTRATOR = 'administrator'
    EMPLOYEE = 'employee'

    ROLE_CHOICES = [
        (SUPERUSER, 'Superusuario'),
        (ADMINISTRATOR, 'Administracion'),
        (EMPLOYEE, 'Empleado'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=EMPLOYEE, verbose_name='Rol de usuario')
    email = models.EmailField(unique=True, verbose_name='Correo electrónico')
    email_verified = models.BooleanField(default=False, verbose_name='Email verificado')
    email_verification_code = models.CharField(max_length=6, null=True, blank=True, verbose_name='Código de verificación')
    email_verification_code_expires = models.DateTimeField(null=True, blank=True, verbose_name='Expiración del código')
    birth_date = models.DateField(null=True, blank=True, verbose_name='Fecha de nacimiento')
    address = models.CharField(max_length=255, null=True, blank=True, verbose_name='Domicilio')
    phone = models.CharField(max_length=30, null=True, blank=True, verbose_name='Teléfono')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name='Foto de perfil')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
