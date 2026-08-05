from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import login, logout
from .serializers import (
    UserRegisterSerializer,
    UserLoginSerializer,
    UserResponseSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordChangeSerializer,
    EmailVerificationSerializer,
    ResendVerificationCodeSerializer,
    UpdateUserRoleSerializer
)
from .interfaces import IUserRepository
from .repositories import UserRepository
from .permissions import IsSuperuser
from .models import Usuario
from .utils import (
    send_password_reset_email,
    send_welcome_email_with_verification_code,
    create_verification_code_for_user,
    verify_user_email,
    is_verification_code_expired
)
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes

class RegisterView(APIView):
    """
    Servicio para registrar nuevos usuarios
    """
    permission_classes = [AllowAny]

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

            verification_code = create_verification_code_for_user(user)

            send_welcome_email_with_verification_code(user, verification_code)
            
            return Response(
                {
                    'message': 'Usuario registrado exitosamente. Se ha enviado un código de verificación a tu email.',
                    'user': UserResponseSerializer(user).data,
                },
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            # En desarrollo, imprime el error para debugging
            print(f"Error al registrar usuario: {e}")
            return Response(
                {'detail':'Error al registrar un usuario'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LoginView(APIView):
    """
    Servicio para login de usuarios
    """
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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

class EmailVerificationView(APIView):
    """
    Servicio para verificar código de email
    """
    permission_classes = [AllowAny]

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        
        try:
            user = self.repository.get_user_by_email(email)
            
            if not user:
                return Response(
                    {'detail': 'Usuario no encontrado.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            if user.email_verified:
                return Response(
                    {'message': 'El email ya está verificado.'},
                    status=status.HTTP_200_OK
                )
            
            if verify_user_email(user, code):
                return Response(
                    {
                        'message': 'Email verificado exitosamente. Tu cuenta está activa.'
                    },
                    status=status.HTTP_200_OK
                )
            else:
                if is_verification_code_expired(user):
                    return Response(
                        {'detail': 'Código de verificación expirado. Solicita uno nuevo.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return Response(
                        {'detail': 'Código de verificación inválido.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
        except Exception as e:
            print(f"Error al verificar email: {e}")
            return Response(
                {'detail': 'Error al verificar el código.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ResendVerificationCodeView(APIView):
    """
    Servicio para reenviar código de verificación de email
    """
    permission_classes = [AllowAny]

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def post(self, request):
        serializer = ResendVerificationCodeSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        
        try:
            user = self.repository.get_user_by_email(email)
            
            if not user:
                return Response(
                    {
                        'message': 'Si el email existe y no está verificado, se ha enviado un nuevo código de verificación.'
                    },
                    status=status.HTTP_200_OK
                )

            if user.email_verified:
                return Response(
                    {'message': 'El email ya está verificado.'},
                    status=status.HTTP_200_OK
                )
            
            try:
                verification_code = create_verification_code_for_user(user)
                send_welcome_email_with_verification_code(user, verification_code)
                
                return Response(
                    {
                        'message': 'Se ha enviado un nuevo código de verificación a tu email.'
                    },
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                print(f"Error al reenviar código: {e}")
                return Response(
                    {'detail': 'Error al reenviar el código de verificación.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            print(f"Error al reenviar código: {e}")
            return Response(
                {'detail': 'Error al reenviar el código de verificación.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CurrentUserView(APIView):
    """
    Devuelve el usuario actual si la sesión está autenticada.
    No crea sesión, solo la verifica. Usado por el frontend para proteger rutas.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "id": request.user.id,
            "email": request.user.email,
            "role": request.user.role,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
        }, status=status.HTTP_200_OK)

class UserListView(APIView):
    """
    Lista todos los usuarios del sistema. Solo accesible para superusuarios.
    """
    permission_classes = [IsSuperuser]

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def get(self, request):
        users = self.repository.get_all_users()
        return Response(
            UserResponseSerializer(users, many=True).data,
            status=status.HTTP_200_OK
        )

class ToggleUserActiveView(APIView):
    """
    Habilita o deshabilita un usuario. Solo accesible para superusuarios.
    Un superusuario no puede deshabilitarse a sí mismo.
    """
    permission_classes = [IsSuperuser]

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def patch(self, request, pk):
        target_user = self.repository.get_user_by_id(pk)

        if not target_user:
            return Response(
                {'detail': 'Usuario no encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if target_user.id == request.user.id:
            return Response(
                {'detail': 'No podés deshabilitarte a vos mismo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_user = self.repository.set_active_status(pk, not target_user.is_active)

        return Response(
            UserResponseSerializer(updated_user).data,
            status=status.HTTP_200_OK
        )

class UpdateUserRoleView(APIView):
    """
    Cambia el rol de un usuario entre administrator y employee. Solo accesible para superusuarios.
    El rol superuser no se otorga ni se modifica por esta vía: esa asignación se hace fuera de la API.
    """
    permission_classes = [IsSuperuser]

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def patch(self, request, pk):
        serializer = UpdateUserRoleSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        new_role = serializer.validated_data['role']

        target_user = self.repository.get_user_by_id(pk)

        if not target_user:
            return Response(
                {'detail': 'Usuario no encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if target_user.role == Usuario.SUPERUSER:
            return Response(
                {'detail': 'No se puede modificar el rol de un superusuario desde la API.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_user = self.repository.set_user_role(pk, new_role)

        return Response(
            UserResponseSerializer(updated_user).data,
            status=status.HTTP_200_OK
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf(request):
    """
    Devuelve el token y setea la cookie csrfToken automáticamente
    """
    return Response({
        'csrfToken':get_token(request)
    })