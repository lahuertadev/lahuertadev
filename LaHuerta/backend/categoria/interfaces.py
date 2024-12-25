from abc import ABC, abstractmethod

class ICategoryRepository(ABC):

    @abstractmethod
    def get_all_categories(self):
        pass

    @abstractmethod
    def create_category(self, data):
        pass

    @abstractmethod
    def modify_category(self, id, data):
        pass
    
    @abstractmethod
    def get_category_by_id(self, id):
        pass

    @abstractmethod
    def destroy_category(self, id):
        pass
