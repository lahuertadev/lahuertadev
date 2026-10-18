from abc import ABC, abstractmethod


class IEmptyMovementRepository(ABC):

    @abstractmethod
    def get_all(self, supplier_name=None, movement_type=None, date_from=None, date_to=None, amount=None):
        pass

    @abstractmethod
    def get_by_id(self, id):
        pass

    @abstractmethod
    def create(self, supplier, date, movement_type, receipt_number, amount):
        pass

    @abstractmethod
    def save(self, movement):
        pass

    @abstractmethod
    def delete(self, movement):
        pass

    @abstractmethod
    def create_containers(self, movement, containers):
        pass

    @abstractmethod
    def replace_containers(self, movement, containers):
        pass
