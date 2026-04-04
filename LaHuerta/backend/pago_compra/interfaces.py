from abc import ABC, abstractmethod


class IPurchasePaymentRepository(ABC):

    @abstractmethod
    def get_all(self, compra_id=None): pass

    @abstractmethod
    def get_by_id(self, id): pass

    @abstractmethod
    def create(self, compra, importe_abonado, tipo_pago, fecha_pago): pass

    @abstractmethod
    def delete(self, payment): pass
