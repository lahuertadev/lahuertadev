from abc import ABC, abstractmethod


class IClientPaymentRepository(ABC):

    @abstractmethod
    def get_all(self, client_id=None, business_name=None, amount_min=None, amount_max=None,
                date_from=None, date_to=None, payment_type_id=None):
        pass

    @abstractmethod
    def get_by_id(self, id):
        pass

    @abstractmethod
    def create(self, client, payment_type, payment_date, amount, observations):
        pass

    @abstractmethod
    def save(self, payment):
        pass

    @abstractmethod
    def update(self, payment, data: dict):
        pass

    @abstractmethod
    def delete(self, payment):
        pass
