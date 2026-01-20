from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import login, logout
from .serializers import (
    UserRegisterSerializer, 
    UserLoginSerializer, 
    UserResponseSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordChangeSerializer
)
from .interfaces import IUserRepository
from .repositories import UserRepository
from .utils import send_password_reset_email
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view


class RegisterView(APIView):
    """
    Servicio para registrar nuevos usuarios
    """
    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        data.pop('password_confirm')

        try:
            user = self.repository.create_user(data)
            return Response(
                {
                    'message': 'Usuario registrado exitosamente',
                    'user': UserResponseSerializer(user).data,
                },
                status=status.HTTP_201_CREATED
            )
        
        except Exception:
            return Response(
                {'detail':'Error al registrar un usuario'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LoginView(APIView):
    """
    Servicio para login de usuarios
    """
    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def post(self, request):
        serializer = UserLoginSerializer(
            data=request.data, 
            context={'request': request}
        )
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        user = self.repository.authenticate(email=data['email'], password=data['password'], request=request)
        
        if not user:
            return Response(
                {'detail':'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'detail':'Usuario inactivo'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        login(request, user) #* loguea el usuario, request ya auntenticadas. Setea las cookies.

        return Response(
            {
                'message': 'Login exitoso',
                'user': UserResponseSerializer(user).data
            },
            status=status.HTTP_200_OK
        )

class LogoutView(APIView):
    """
    Servicio para logout de usuarios
    Cierra la sesión y limpia las cookies
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)  
        
        return Response(
            {
                'message': 'Cierre de sesión exitoso'
            },
            status=status.HTTP_200_OK
        )

class PasswordResetRequestView(APIView):
    """
    Servicio para solicitar reset de contraseña
    Envía un token al email del usuario
    """
    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        user = self.repository.get_user_by_email(email)
        
        if user:
            uid, token = self.repository.generate_password_reset_token(user)
            send_password_reset_email(user, uid, token)
        
        # Mismo mensaje por seguridad (no revela si el email existe o no)
        return Response(
            {
                'message': 'Si el email existe, se ha enviado un código de recuperación a tu correo electrónico.'
            },
            status=status.HTTP_200_OK
        )

class PasswordResetConfirmView(APIView):
    """
    Servicio para confirmar reset de contraseña con token
    """
    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token_data = {
            'uid': serializer.validated_data['uid'],
            'token': serializer.validated_data['token']
        }
        new_password = serializer.validated_data['new_password']
        
        try:
            user = self.repository.reset_password(token_data, new_password)
            
            if user:
                return Response(
                    {
                        'message': 'Contraseña restablecida exitosamente.'
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {
                        'detail': 'Token inválido o expirado.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'detail': 'Error al restablecer la contraseña.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PasswordChangeView(APIView):
    """
    Servicio para cambiar contraseña (requiere autenticación)
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']
        
        try:
            success = self.repository.change_password(
                request.user,
                old_password,
                new_password
            )
            
            if success:
                return Response(
                    {
                        'message': 'Contraseña cambiada exitosamente.'
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {
                        'detail': 'La contraseña actual es incorrecta.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'detail': 'Error al cambiar la contraseña.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
def csrf(request):
    """
    Devuelve el token y setea la cookie csrfToken automáticamente
    """
    return Response({
        'csrfToken':get_token(request)
    })