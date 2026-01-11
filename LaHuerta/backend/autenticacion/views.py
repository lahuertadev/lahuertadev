from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import login
from .serializers import UserRegisterSerializer, UserLoginSerializer, UserResponseSerializer
from .interfaces import IUserRepository
from .repositories import UserRepository
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


@api_view(['GET'])
def csrf(request):
    """
    Devuelve el token y setea la cookie csrfToken automáticamente
    """
    return Response({
        'csrfToken':get_token(request)
    })