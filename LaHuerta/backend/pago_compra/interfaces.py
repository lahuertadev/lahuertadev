from abc import ABC, abstractmethod


class IPurchasePaymentRepository(ABC):

    @abstractmethod
    def get_all(self, compra_id=None, supplier_id=None, supplier=None, kind=None, payment_type_id=None,
                amount_min=None, amount_max=None, date_from=None, date_to=None, state=None): pass

    @abstractmethod
    def get_by_id(self, id): pass

    @abstractmethod
    def create(self, proveedor, importe_abonado, tipo_pago, fecha_pago): pass

    @abstractmethod
    def add_client_check_use(self, payment, check): pass

    @abstractmethod
    def add_own_check_use(self, payment, own_check, amount): pass

    @abstractmethod
    def replace_purchase_applications(self, payment, applications): pass

    @abstractmethod
    def get_purchase_applications_newest_first(self, payment): pass

    @abstractmethod
    def update_purchase_application(self, application, amount): pass

    @abstractmethod
    def update(self, payment, data): pass

