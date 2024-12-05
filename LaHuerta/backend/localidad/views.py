from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import DistrictRepository
from municipio.repositories import CityRepository
from municipio.serializers import CitySerializer
from provincia.repositories import ProvinceRepository
from provincia.serializers import ProvinceSerializer
from .serializers import DistrictSerializer

class DistrictViewSet(viewsets.ModelViewSet):
    district_repository = DistrictRepository()
    city_repository = CityRepository()
    province_repository = ProvinceRepository()
    serializer_class = DistrictSerializer

    def get_queryset(self):
        return self.district_repository.get_all_districts()

    @action(detail=False, methods=['post'])
    def create_if_not_exists(self, request):
        district_id = request.data.get('id')
        district_name = request.data.get('nombre')
        city = request.data.get('municipio')

        existing_city = self.city_repository.get_city_by_id(city.get('id'))

        if not existing_city: 
            province_data = city.get('provincia')
            existing_province = self.province_repository.get_province_by_id(province_data.get('id'))

            if not existing_province:
                province_serializer = ProvinceSerializer(data=province_data)

                if not province_serializer.is_valid():
                    return Response(province_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                existing_province= self.province_repository.create_province(
                    province_data.get('id'), 
                    province_data.get('nombre')
                )


            city['provincia'] = existing_province
            city_serializer = CitySerializer(data=city)

            if not city_serializer.is_valid():
                return Response(city_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            existing_city = self.city_repository.create_city(city)

        existing_district = self.district_repository.get_district_by_id(district_id)

        if existing_district:
            return Response({'message':'La localidad ya existe'}, status=status.HTTP_200_OK)

        district_data = {
            'id': district_id,
            'nombre': district_name,
            'municipio': existing_city
        }
        serializer = DistrictSerializer(data=district_data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        district = self.district_repository.create_district(district_data)
        return Response({'message':'Localidad creada exitosamente'}, status=status.HTTP_201_CREATED)
