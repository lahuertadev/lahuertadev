from abc import ABC, abstractmethod

class IContainerTypeRepository(ABC):
    @abstractmethod
    def get_all_container_types(self):
        pass