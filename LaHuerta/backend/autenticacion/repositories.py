from django.contrib.auth import authenticate
from .models import Usuario
from .interfaces import IUserRepository

class UserRepository(IUserRepository):

    def create_user(self, data):
        return Usuario.objects.create_user(
            email=data['email'],
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            role=data.get('role', Usuario.EMPLOYEE)
        )

    def authenticate(self, email, password, request=None):
        return authenticate(
            request=request,
            username=email,
            password=password
        )
