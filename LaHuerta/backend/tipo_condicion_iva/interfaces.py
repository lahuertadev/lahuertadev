from abc import ABC, abstractmethod

class ITypeConditionIvaRepository(ABC):
    @abstractmethod
    def get_all_type_condition_iva(self):
        pass

    # @abstractmethod
    # def create_type_condition_iva(self, data):
    #     pass


