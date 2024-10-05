from abc import ABC, abstractmethod

class IDeliveryDayRepository(ABC):
    @abstractmethod
    def get_all_delivery_days(self):
        pass