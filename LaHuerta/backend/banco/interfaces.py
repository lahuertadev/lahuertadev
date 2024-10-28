from abc import ABC, abstractmethod

class IBankRepository(ABC):
    @abstractmethod
    def get_all_banks(self):
        pass