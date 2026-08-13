from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
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
    UpdateUserRoleSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    AvatarUploadSerializer
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
    is_verification_code_expired,
    get_upcoming_celebrations
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
    Devuelve el usuario actual si la sesión está autenticada, y permite editar
    los datos personales del propio perfil.
    Usado por el frontend para proteger rutas y para la pantalla de Perfil.
    """

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def get(self, request):
        try:
            return Response(
                ProfileSerializer(request.user, context={'request': request}).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error al obtener el perfil: {e}")
            return Response(
                {'detail': 'Error al obtener el perfil.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            updated_user = self.repository.update_profile(request.user, serializer.validated_data)
            return Response(
                ProfileSerializer(updated_user, context={'request': request}).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error al actualizar el perfil: {e}")
            return Response(
                {'detail': 'Error al actualizar el perfil.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AvatarUploadView(APIView):
    """
    Sube o reemplaza la foto de perfil del usuario autenticado.
    """
    parser_classes = [MultiPartParser, FormParser]

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            updated_user = self.repository.set_avatar(request.user, serializer.validated_data['avatar'])
            return Response(
                ProfileSerializer(updated_user, context={'request': request}).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error al subir el avatar: {e}")
            return Response(
                {'detail': 'Error al subir la foto de perfil.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CelebrationsView(APIView):
    """
    Devuelve los cumpleaños y aniversarios laborales de usuarios activos que
    caen hoy o dentro de los próximos días (ver CELEBRATIONS_WINDOW_DAYS).
    Visible para cualquier usuario autenticado, sin restricción de rol.
    """

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def get(self, request):
        try:
            users = self.repository.get_active_users()
            celebrations = get_upcoming_celebrations(users)
            return Response(celebrations, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error al obtener cumpleaños y aniversarios: {e}")
            return Response(
                {'detail': 'Error al obtener los próximos cumpleaños y aniversarios.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserListView(APIView):
    """
    Lista todos los usuarios del sistema. Solo accesible para superusuarios.
    """
    permission_classes = [IsSuperuser]

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def get(self, request):
        try:
            users = self.repository.get_all_users()
            return Response(
                UserResponseSerializer(users, many=True).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error al listar usuarios: {e}")
            return Response(
                {'detail': 'Error al listar los usuarios.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ToggleUserActiveView(APIView):
    """
    Habilita o deshabilita un usuario. Solo accesible para superusuarios.
    Un superusuario no puede deshabilitarse a sí mismo, ni deshabilitar a
    otro superusuario: esa acción se hace fuera de la API.
    """
    permission_classes = [IsSuperuser]

    def __init__(self, repository: IUserRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or UserRepository()

    def patch(self, request, pk):
        try:
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

            if target_user.role == Usuario.SUPERUSER:
                return Response(
                    {'detail': 'No se puede habilitar/deshabilitar a un superusuario desde la API.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            updated_user = self.repository.set_active_status(pk, not target_user.is_active)

            return Response(
                UserResponseSerializer(updated_user).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error al habilitar/deshabilitar usuario: {e}")
            return Response(
                {'detail': 'Error al actualizar el estado del usuario.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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

        try:
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
        except Exception as e:
            print(f"Error al actualizar el rol del usuario: {e}")
            return Response(
                {'detail': 'Error al actualizar el rol del usuario.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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