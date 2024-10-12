from abc import ABC, abstractmethod

class IPaymentRepository(ABC):
    @abstractmethod
    def get_all_payments(self):
        pass