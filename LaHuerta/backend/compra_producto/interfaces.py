from abc import ABC, abstractmethod


class IBuyProductRepository(ABC):

    @abstractmethod
    def create_products(self, buy, products):
        pass

    @abstractmethod
    def replace_products(self, buy, products):
        pass
