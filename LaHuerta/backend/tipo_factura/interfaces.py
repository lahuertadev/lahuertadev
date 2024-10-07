from abc import ABC, abstractmethod

class IBillTypeRepository(ABC):
    @abstractmethod
    def get_all_bill_types(self):
        pass