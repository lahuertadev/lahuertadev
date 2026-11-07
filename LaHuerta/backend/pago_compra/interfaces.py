from abc import ABC, abstractmethod


class IPurchasePaymentRepository(ABC):

    @abstractmethod
    def get_all(self, compra_id=None, supplier_id=None): pass

    @abstractmethod
    def get_by_id(self, id): pass

    @abstractmethod
    def create(self, proveedor, importe_abonado, tipo_pago, fecha_pago, compra=None, cheque_propio=None): pass

    @abstractmethod
    def update(self, payment, data): pass

    @abstractmethod
    def delete(self, payment): pass
