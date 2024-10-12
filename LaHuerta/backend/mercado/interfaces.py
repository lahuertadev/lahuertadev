from abc import ABC, abstractmethod

class IMarketRepository(ABC):
    @abstractmethod
    def get_all_markets(self):
        pass