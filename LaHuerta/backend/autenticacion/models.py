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

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
