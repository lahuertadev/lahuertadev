from rest_framework import serializers
from django.contrib.auth import authenticate
import re
from .models import Usuario


class UserRegisterSerializer(serializers.ModelSerializer):
    """
    DTO para el registro de nuevos usuarios
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
    )

    class Meta:
        model = Usuario
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'password_confirm', 'role']
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este usuario ya está registrado.")
        return value

    def validate_password(self, value):
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

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer para el login de usuarios
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'), username=email, password=password)
            if not user:
                raise serializers.ValidationError('Credenciales inválidas.')
            if not user.is_active:
                raise serializers.ValidationError('Usuario inactivo.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Debe proporcionar email y contraseña.')

        return attrs


class UserResponseSerializer(serializers.ModelSerializer):
    """
    Serializer para mostrar información del usuario (sin password)
    """
    class Meta:
        model = Usuario
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']
