from abc import ABC, abstractmethod


class IProductPriceListRepository(ABC):
    @abstractmethod
    def get_all(self, price_list_id=None, product_id=None, categoria_id=None, tipo_contenedor_id=None, descripcion=None):
        pass

    @abstractmethod
    def get_by_id(self, id):
        pass

    @abstractmethod
    def create(self, data):
        pass

    @abstractmethod
    def update(self, item, data):
        pass

    @abstractmethod
    def destroy(self, item):
        pass

    @abstractmethod
    def verify_product_on_price_list(self, product_id):
        pass