from abc import ABC, abstractmethod


class ISupplierRepository(ABC):

    @abstractmethod
    def get_all_suppliers(self, searchQuery=None, mercado=None):
        pass

    @abstractmethod
    def get_supplier_by_id(self, id):
        pass

    @abstractmethod
    def create_supplier(self, data):
        pass

    @abstractmethod
    def modify_supplier(self, supplier, data):
        pass

    @abstractmethod
    def delete_supplier(self, supplier):
        pass
