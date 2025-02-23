from abc import ABC, abstractmethod
#from .models import Provincia

class IProvinceRepository(ABC):
    @abstractmethod
    def get_all_provinces(self):
        pass

    @abstractmethod
    def get_province_by_id(self, province_id):
        pass

    @abstractmethod
    def create_province(self, province_id, province_name):
        pass