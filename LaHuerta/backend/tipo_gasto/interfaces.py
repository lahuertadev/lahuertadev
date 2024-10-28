from abc import ABC, abstractmethod

class ITipoGastoRepository(ABC):
    @abstractmethod
    def create_type_expense(self, data):
        pass

    @abstractmethod
    def get_all_type_expenses(self):
        pass

