from .models import Municipio
from .interfaces import ICityRepository

class CityRepository(ICityRepository):
    def get_all_cities(self):
        return Municipio.objects.all()
    
    def get_city_by_id(self, city_id):
        return Municipio.objects.filter(id=city_id).first()
    
    def create_city(self, data):
        city = Municipio.objects.create(
            id=data['id'],
            nombre=data['nombre'],
            provincia= data['provincia']
        )
        return city