from abc import ABC, abstractmethod

class IBillRepository(ABC):
    @abstractmethod
    def get_all_bills(self):
        pass