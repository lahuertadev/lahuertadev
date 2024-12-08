from abc import ABC, abstractmethod

class IClientRepository(ABC):
    @abstractmethod
    def get_all_clients(self):
        pass

    @abstractmethod
    def get_client_by_cuit(self, cuit):
        pass
    
    @abstractmethod
    def create_client(self, data):
        pass