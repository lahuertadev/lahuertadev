from abc import ABC, abstractmethod

class IPaymentTypeRepository(ABC):
    @abstractmethod
    def get_all_payment_types(self):
        pass