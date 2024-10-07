from abc import ABC, abstractmethod

class ICategoryRepository(ABC):
    @abstractmethod
    def get_all_categories(self):
        pass