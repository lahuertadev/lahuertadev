from .models import Provincia
from .interfaces import IProvinceRepository

class ProvinceRepository(IProvinceRepository):
    
    def get_all_provinces(self):
        return Provincia.objects.all()
    
    def get_province_by_id(self, province_id):
        return Provincia.objects.filter(id=province_id).first()
    
    def create_province(self, province_id, province_name):
        province = Provincia.objects.create(
            id=province_id,
            nombre=province_name
        )
        return province