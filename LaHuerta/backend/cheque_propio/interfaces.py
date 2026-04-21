from abc import ABC, abstractmethod


class IOwnCheckRepository(ABC):

    @abstractmethod
    def get_all(self, state=None, bank=None, available=None, supplier_id=None):
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

    @abstractmethod
    def get_payments(self, own_check):
        pass
