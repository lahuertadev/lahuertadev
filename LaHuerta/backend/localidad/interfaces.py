from abc import ABC, abstractmethod


class IDistrictRepository(ABC):
    @abstractmethod
    def get_all_districts(self):
        pass

    @abstractmethod
    def create_if_not_exists(self, district_id, district_name, city_id):
        pass