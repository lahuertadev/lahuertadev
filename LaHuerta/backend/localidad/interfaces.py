from abc import ABC, abstractmethod


class IDistrictRepository(ABC):
    @abstractmethod
    def get_all_districts(self):
        pass

    @abstractmethod
    def get_district_by_id(self, id):
        pass

    @abstractmethod
    def create_district(self, data):
        pass