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
    def get_user_by_email_any_status(self, email):
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

    @abstractmethod
    def get_all_users(self):
        pass

    @abstractmethod
    def get_user_by_id(self, user_id):
        pass

    @abstractmethod
    def set_active_status(self, user_id, is_active):
        pass

    @abstractmethod
    def set_user_role(self, user_id, role):
        pass

    @abstractmethod
    def get_active_users(self):
        pass

    @abstractmethod
    def get_superusers(self):
        pass

    @abstractmethod
    def update_profile(self, user, data):
        pass

    @abstractmethod
    def set_avatar(self, user, avatar_file):
        pass
