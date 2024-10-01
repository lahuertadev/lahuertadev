from abc import ABC, abstractmethod
from .models import Gasto

class IExpenseRepository(ABC):
    @abstractmethod
    def get_expenses_by_type_expenses_id(self, tipo_gasto_id):
        pass

    @abstractmethod
    def get_all_expenses(self):
        pass

    @abstractmethod
    def create_expense(self, data):
        pass

    @abstractmethod
    def modify_expense(self, id, data):
        pass

    @abstractmethod
    def delete_expense(self, id):
        pass
