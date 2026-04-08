from abc import ABC, abstractmethod


class IBillRepository(ABC):

    @abstractmethod
    def get_all(self, cliente_id=None):
        pass

    @abstractmethod
    def get_by_id(self, id):
        pass

    @abstractmethod
    def create(self, client, bill_type, date, amount):
        pass

    @abstractmethod
    def save(self, bill):
        pass

    @abstractmethod
    def delete(self, bill):
        pass