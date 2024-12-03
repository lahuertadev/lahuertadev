from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import CityRepository
from .serializers import CitySerializer

class CityViewSet(viewsets.ModelViewSet):
    city_repository = CityRepository()
    serializer_class = CitySerializer

    def get_queryset(self):
        return self.city_repository.get_all_cities()

    @action(detail=False, methods=['post'])
    def create_if_not_exists(self, request):
        serializer = CitySerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        city_id = serializer.validated_data.get('id')
        city_name = serializer.validated_data.get('nombre')
        province_id = serializer.validated_data.get('provincia')

        city, created = self.city_repository.create_if_not_exists(city_id, city_name, province_id)

        if created:
            return Response({'message':'Municipio creado exitosamente'}, status=status.HTTP_201_CREATED)
        return Response({'message':'El municipio ya existe'}, status=status.HTTP_200_OK)