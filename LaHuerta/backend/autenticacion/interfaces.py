from abc import ABC, abstractmethod

class IUserRepository(ABC):

    @abstractmethod
    def create_user(self, data):
        pass

    @abstractmethod
    def authenticate(self, email, password, request=None):
        pass
