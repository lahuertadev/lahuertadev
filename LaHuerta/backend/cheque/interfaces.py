from abc import ABC, abstractmethod


class ICheckRepository(ABC):

    @abstractmethod
    def get_all(self, bank=None, state=None, endorsed=None, deposit_date_from=None, deposit_date_to=None):
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
