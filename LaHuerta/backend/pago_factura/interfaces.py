from abc import ABC, abstractmethod

class IBillPaymentRepository(ABC):
    @abstractmethod
    def get_all_bill_payments(self):
        pass