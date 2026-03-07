from abc import ABC, abstractmethod


class IBillPaymentRepository(ABC):

    @abstractmethod
    def get_all(self, payment_id=None, bill_id=None):
        pass

    @abstractmethod
    def get_by_id(self, id):
        pass

    @abstractmethod
    def create(self, pago_cliente, factura, importe_abonado):
        pass

    @abstractmethod
    def save(self, record):
        pass

    @abstractmethod
    def delete(self, record):
        pass

    @abstractmethod
    def get_total_paid_for_bill(self, factura_id, exclude_id=None):
        pass

