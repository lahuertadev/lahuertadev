from .models import Municipio
from .interfaces import ICityRepository

class CityRepository(ICityRepository):
    def get_all_cities(self):
        return Municipio.objects.all()
    
    def create_if_not_exists(self, city_id, city_name, province_id):
        city, created = Municipio.objects.get_or_create(
            id=city_id,
            nombre=city_name,
            province_id=province_id
        )
        return city, created