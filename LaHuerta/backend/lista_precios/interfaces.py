from abc import ABC, abstractmethod

class IPricesListRepository(ABC):
    @abstractmethod
    def get_all_prices_list(self):
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