from abc import ABC, abstractmethod


class ICheckRepository(ABC):

    @abstractmethod
    def get_all(self, number=None, bank=None, state=None, endorsed=None, deposit_date_from=None, deposit_date_to=None, tab=None):
        pass

    @abstractmethod
    def get_by_id(self, id):
        pass

    @abstractmethod
    def exists_duplicate(self, number, bank, client, exclude_id=None):
        pass

    @abstractmethod
    def create(self, data: dict):
        pass

    @abstractmethod
    def update(self, check, data: dict):
        pass

    @abstractmethod
    def delete(self, check):
        pass

    @abstractmethod
    def get_purchase_payment_ids(self, check):
        pass
