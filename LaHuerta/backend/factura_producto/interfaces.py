from abc import ABC, abstractmethod
class IBillProductRepository():
    def verify_product_on_bill(self, product_id):
        pass

    @abstractmethod
    def create_products(self, bill, products):
        pass

    @abstractmethod
    def replace_products(self, bill, products):
        pass