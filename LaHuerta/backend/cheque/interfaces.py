from abc import ABC, abstractmethod

class ICheckRepository(ABC):
    @abstractmethod
    def get_all_checks(self):
        pass