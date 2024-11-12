from abc import ABC, abstractmethod
from .models import Gasto

class IExpenseRepository(ABC):
    @abstractmethod
    def get_expenses_by_type_expenses_id(self, tipo_gasto_id):
        pass

    @abstractmethod
    def get_all_expenses(self, amount=None, date=None, expense_type=None):
        pass

    @abstractmethod
    def get_expense_by_id(self):
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

    @abstractmethod
    def get_expense_by_id(self, expense_id):
        pass

    @abstractmethod
    def get_expenses_filtered_by_date(self, start_date, end_date):
        pass