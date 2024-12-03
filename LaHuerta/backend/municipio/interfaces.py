from abc import ABC, abstractmethod

class ICityRepository(ABC):
    @abstractmethod
    def get_all_cities(self):
        pass

    @abstractmethod
    def create_if_not_exists(self, city_id, city_name, province_id):
        pass