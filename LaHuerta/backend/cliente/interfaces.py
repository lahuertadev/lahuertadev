from abc import ABC, abstractmethod


class IClientRepository(ABC):

    @abstractmethod
    def get_all_clients(self, cuit=None, searchQuery=None, address=None):
        pass
      
    @abstractmethod
    def get_client_by_id(self, id):
        pass

    @abstractmethod
    def get_client_by_cuit(self, cuit):
        pass

    @abstractmethod
    def create_client(self, data):
        pass

    @abstractmethod
    def modify_client(self, client, data):
        pass

    @abstractmethod
    def delete_client(self, client):
        pass

    @abstractmethod
    def update_balance(self, client):
        pass
