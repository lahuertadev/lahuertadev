from abc import ABC, abstractmethod

class ISupplierRepository(ABC):
    @abstractmethod
    def get_all_suppliers(self):
        pass