from abc import ABC, abstractmethod

class IPricesListRepository(ABC):
    @abstractmethod
    def get_all_prices_list(self):
        pass