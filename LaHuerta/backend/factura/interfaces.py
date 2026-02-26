from abc import ABC, abstractmethod


class IBillRepository(ABC):

    @abstractmethod
    def get_all_bills(self, cliente_id=None):
        pass

    @abstractmethod
    def get_bill_by_id(self, id):
        pass

    @abstractmethod
    def create_bill(self, data):
        pass

    @abstractmethod
    def update_bill(self, id, data):
        pass
