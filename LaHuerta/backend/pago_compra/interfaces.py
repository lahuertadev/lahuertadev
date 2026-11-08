from abc import ABC, abstractmethod


class IPurchasePaymentRepository(ABC):

    @abstractmethod
    def get_all(self, compra_id=None, supplier_id=None, supplier=None, kind=None, payment_type_id=None,
                amount_min=None, amount_max=None, date_from=None, date_to=None): pass

    @abstractmethod
    def get_by_id(self, id): pass

    @abstractmethod
    def create(self, proveedor, importe_abonado, tipo_pago, fecha_pago, compra=None): pass

    @abstractmethod
    def add_own_check_use(self, payment, own_check, amount): pass

    @abstractmethod
    def update(self, payment, data): pass

    @abstractmethod
    def delete(self, payment): pass
