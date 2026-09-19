from abc import ABC, abstractmethod


class IBuyProductRepository(ABC):

    @abstractmethod
    def verify_product_on_buys(self, product_id):
        pass

    @abstractmethod
    def create_products(self, buy, products):
        pass

    @abstractmethod
    def replace_products(self, buy, products):
        pass
