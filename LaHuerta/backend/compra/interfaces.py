from abc import ABC, abstractmethod


class IBuyRepository(ABC):

    @abstractmethod
    def get_all(self, proveedor_id=None, fecha_desde=None, fecha_hasta=None,
                importe_min=None, importe_max=None):
        pass

    @abstractmethod
    def get_by_id(self, id):
        pass

    @abstractmethod
    def create(self, proveedor, fecha, importe, senia):
        pass

    @abstractmethod
    def save(self, buy):
        pass

    @abstractmethod
    def delete(self, buy):
        pass
