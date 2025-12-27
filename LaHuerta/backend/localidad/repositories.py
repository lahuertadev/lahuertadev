from .models import Localidad
from .interfaces import IDistrictRepository

class DistrictRepository(IDistrictRepository):
    def get_all_districts(self):
        return Localidad.objects.all()
    
    def get_district_by_id(self, id):
        return Localidad.objects.filter(id=id).first()
    
    def create_district(self, data):
        district = Localidad.objects.create(
            id=data['id'],
            nombre=data['nombre'],
            municipio= data['municipio']
        )
        return district