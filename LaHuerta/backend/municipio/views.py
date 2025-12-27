from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import CityRepository
from provincia.repositories import ProvinceRepository
from provincia.serializers import ProvinceSerializer
from .serializers import CitySerializer

class CityViewSet(viewsets.ModelViewSet):
    city_repository = CityRepository()
    province_repository = ProvinceRepository()
    serializer_class = CitySerializer

    def get_queryset(self):
        return self.city_repository.get_all_cities()

    @action(detail=False, methods=['post'])
    def create_if_not_exists(self, request):
        
        city_id = request.data.get('id')
        city_name = request.data.get('nombre')
        province = request.data.get('provincia')

        existing_province = self.province_repository.get_province_by_id(province.get('id'))
        if not existing_province:
            province_serializer = ProvinceSerializer(data=province)

            if not province_serializer.is_valid():
                return Response(province_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            existing_province= self.province_repository.create_province(
                province.get('id'), 
                province.get('nombre')
            )

        existing_city = self.city_repository.get_city_by_id(city_id)
        
        if existing_city:
            return Response({'message':'El municipio ya existe'}, status=status.HTTP_200_OK)
        
        city_data = {
            'id': city_id,
            'nombre': city_name,
            'provincia':existing_province
        }

        serializer = CitySerializer(data=city_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        city = self.city_repository.create_city(city_data)
        return Response({'message':'Municipio creado exitosamente'}, status=status.HTTP_201_CREATED)
