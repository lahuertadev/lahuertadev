from abc import ABC, abstractmethod

class IUnitTypeRepository(ABC):
    @abstractmethod
    def get_all_unit_types(self):
        pass

    @abstractmethod
    def get_unit_type_by_id(self, id):
        pass

    @abstractmethod
    def create_unit_type(self, data):
        pass

    @abstractmethod
    def modify_unit_type(self, unit_type, data):
        pass

    @abstractmethod
    def destroy_unit_type(self, unit_type):
        pass