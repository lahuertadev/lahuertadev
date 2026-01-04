from abc import ABC, abstractmethod

class IConditionIvaTypeRepository(ABC):

    @abstractmethod
    def get_all(self):
        pass

    def create(self, data):
        pass


