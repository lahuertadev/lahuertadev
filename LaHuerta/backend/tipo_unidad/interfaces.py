from abc import ABC, abstractmethod

class IUnitTypeRepository(ABC):
    @abstractmethod
    def get_all_unit_types(self):
        pass