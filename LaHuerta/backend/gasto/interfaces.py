from abc import ABC, abstractmethod
from .models import Gasto

class IGastoRepository(ABC):
    @abstractmethod
    def get_expenses_by_type_expenses_id(self, tipo_gasto_id):
        pass

    @abstractmethod
    def get_all_expenses(self):
        pass

    @abstractmethod
    def get_all_expenses(self):
        pass
    
