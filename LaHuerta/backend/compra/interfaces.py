from abc import ABC, abstractmethod

class IBuyRepository(ABC):
    @abstractmethod
    def get_all_buys(self):
        pass