from abc import ABC, abstractmethod

class IProductRepository(ABC):
    @abstractmethod
    def get_all_products(self):
        pass