from abc import ABC, abstractmethod


class ICheckRepository(ABC):

    @abstractmethod
    def get_all(self):
        pass

    @abstractmethod
    def get_by_id(self, numero):
        pass

    @abstractmethod
    def create(self, data: dict):
        pass

    @abstractmethod
    def update(self, cheque, data: dict):
        pass

    @abstractmethod
    def delete(self, cheque):
        pass
