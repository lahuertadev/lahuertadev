from abc import ABC, abstractmethod


class IMarketRepository(ABC):

    @abstractmethod
    def get_all_markets(self):
        pass

    @abstractmethod
    def get_market_by_id(self, id):
        pass

    @abstractmethod
    def create_market(self, data):
        pass

    @abstractmethod
    def modify_market(self, market, data):
        pass

    @abstractmethod
    def delete_market(self, market):
        pass
