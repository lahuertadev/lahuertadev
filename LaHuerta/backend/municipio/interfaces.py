from abc import ABC, abstractmethod

class ICityRepository(ABC):
    @abstractmethod
    def get_all_cities(self):
        pass

    abstractmethod
    def get_city_by_id(self, city_id):
        pass

    @abstractmethod
    def create_city(self, data):
        pass