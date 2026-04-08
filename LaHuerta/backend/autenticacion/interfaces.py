from abc import ABC, abstractmethod

class IUserRepository(ABC):

    @abstractmethod
    def create_user(self, data):
        pass

    @abstractmethod
    def authenticate(self, email, password, request=None):
        pass

    @abstractmethod
    def get_user_by_email(self, email):
        pass

    @abstractmethod
    def generate_password_reset_token(self, user):
        pass

    @abstractmethod
    def validate_password_reset_token(self, token):
        pass

    @abstractmethod
    def reset_password(self, token, new_password):
        pass

    @abstractmethod
    def change_password(self, user, old_password, new_password):
        pass
