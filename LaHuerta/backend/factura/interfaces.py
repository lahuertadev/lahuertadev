from abc import ABC, abstractmethod


class IBillRepository(ABC):

    @abstractmethod
    def get_all(self, client_id=None, cuit=None, business_name=None, amount_min=None, amount_max=None, date_from=None, date_to=None, bill_type_id=None):
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

    @abstractmethod
    def get_last_receipt_number(self, bill_type_id: int) -> int:
        pass