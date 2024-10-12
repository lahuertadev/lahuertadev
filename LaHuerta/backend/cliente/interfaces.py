from abc import ABC, abstractmethod

class IClientRepository(ABC):
    @abstractmethod
    def get_all_clients(self):
        pass