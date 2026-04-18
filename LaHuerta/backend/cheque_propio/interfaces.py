from abc import ABC, abstractmethod


class IOwnCheckRepository(ABC):

    @abstractmethod
    def get_all(self, proveedor=None, estado=None, banco=None):
        pass

    @abstractmethod
    def get_by_id(self, numero):
        pass

    @abstractmethod
    def create(self, data: dict):
        pass

    @abstractmethod
    def update(self, own_check, data: dict):
        pass

    @abstractmethod
    def delete(self, own_check):
        pass
