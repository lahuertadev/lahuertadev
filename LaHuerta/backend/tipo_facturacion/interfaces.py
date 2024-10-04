from abc import ABC, abstractmethod

class ITipoFacturacionRepository(ABC):
    @abstractmethod
    def create_facturation_type(self, data):
        pass

    @abstractmethod
    def get_all_facturation_types(self):
        pass

