from abc import ABC, abstractmethod

class IPricesListRepository(ABC):
    @abstractmethod
    def get_all_prices_list(self, nombre=None):
        pass

    @abstractmethod
    def get_prices_list_by_id(self, id):
        pass

    @abstractmethod
    def create_prices_list(self, data):
        pass

    @abstractmethod
    def modify_prices_list(self, prices_list, data):
        pass

    @abstractmethod
    def destroy_prices_list(self, prices_list):
        pass

    @abstractmethod
    def count_assigned_clients(self, prices_list):
        pass

    @abstractmethod
    def get_missing_client_ids(self, client_ids):
        pass

    @abstractmethod
    def assign_to_clients(self, prices_list, client_ids):
        pass

    @abstractmethod
    def generate_unique_name(self, base_name):
        pass

    @abstractmethod
    def duplicate_prices_list(self, original_list):
        pass