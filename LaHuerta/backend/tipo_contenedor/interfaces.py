from abc import ABC, abstractmethod

class IContainerTypeRepository(ABC):
    @abstractmethod
    def get_all_container_types(self):
        pass

    @abstractmethod
    def get_container_by_id(self, id):
        pass

    @abstractmethod
    def create_container_type(self, data):
        pass

    @abstractmethod
    def modify_container_type(self, container_type, data):
        pass

    @abstractmethod
    def destroy_container_type(self, container_type):
        pass