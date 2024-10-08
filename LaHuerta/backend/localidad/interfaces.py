from abc import ABC, abstractmethod

class ITownRepository(ABC):
    @abstractmethod
    def get_all_towns(self):
        pass