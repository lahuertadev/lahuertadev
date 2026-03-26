from abc import ABC, abstractmethod


class IBankRepository(ABC):

    @abstractmethod
    def get_all_banks(self):
        pass

    @abstractmethod
    def get_bank_by_id(self, id):
        pass

    @abstractmethod
    def create_bank(self, data):
        pass

    @abstractmethod
    def modify_bank(self, bank, data):
        pass

    @abstractmethod
    def delete_bank(self, bank):
        pass