from .models import Localidad
from .interfaces import IDistrictRepository

class DistrictRepository(IDistrictRepository):
    def get_all_districts(self):
        return Localidad.objects.all()
    
    def create_if_not_exists(self, district_id, district_name, city_id):
        district, created = Localidad.objects.get_or_create(
            id=district_id,
            nombre=district_name,
            municipio_id=city_id
        )
        return district, created