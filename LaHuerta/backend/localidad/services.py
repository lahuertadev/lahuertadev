from municipio.serializers import CitySerializer
from provincia.serializers import ProvinceSerializer
from .serializers import DistrictCreateUpdateSerializer
from .repositories import DistrictRepository
from municipio.repositories import CityRepository
from provincia.repositories import ProvinceRepository

class DistrictService:
    def __init__(self):
        self.district_repository = DistrictRepository()
        self.city_repository = CityRepository()
        self.province_repository = ProvinceRepository()

    def create_or_get_district(self, district_data):
        """
        Crea una localidad junto con su municipio y provincia si no existen.
        """
        district_id = district_data.get('id')
        district_name = district_data.get('nombre')
        city_data = district_data.get('municipio')

        existing_city = self.city_repository.get_city_by_id(city_data.get('id'))
        
        if not existing_city:
            province_data = city_data.get('provincia')
            existing_province = self.province_repository.get_province_by_id(province_data.get('id'))

            if not existing_province:
                province_serializer = ProvinceSerializer(data=province_data)

                if not province_serializer.is_valid():
                    return {
                        "status": "error", 
                        "message": province_serializer.errors,
                        "http_status": 400
                    }

                existing_province = self.province_repository.create_province(
                    province_data.get('id'),
                    province_data.get('nombre')
                )

            city_data['provincia'] = existing_province
            city_serializer = CitySerializer(data=city_data)

            if not city_serializer.is_valid():
                return {
                    "status": "error", 
                    "message": city_serializer.errors, 
                    "http_status": 400
                }

            existing_city = self.city_repository.create_city(city_data)

        existing_district = self.district_repository.get_district_by_id(district_id)

        if existing_district:
            return {
                "status": "success", 
                "message": "La localidad ya existe", 
                'district':existing_district,
                "http_status": 200
            }

        district_data = {
            'id': district_id,
            'nombre': district_name,
            'municipio': existing_city
        }
        district_serializer = DistrictCreateUpdateSerializer(data=district_data)

        if not district_serializer.is_valid():
            return {
                "status": "error", 
                "message": district_serializer.errors,
                "http_status": 400
            }

        new_district = self.district_repository.create_district(district_data)

        return {
            "status": "success", 
            "message": "Localidad creada exitosamente",
            'district': new_district, 
            "http_status": 201
        }
