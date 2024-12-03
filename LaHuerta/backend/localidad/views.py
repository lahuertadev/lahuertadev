from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import DistrictRepository
from .serializers import DistrictSerializer

class DistrictViewSet(viewsets.ModelViewSet):
    district_repository = DistrictRepository()
    serializer_class = DistrictSerializer

    def get_queryset(self):
        return self.district_repository.get_all_districts()

    @action(detail=False, methods=['post'])
    def create_if_not_exists(self, request):
        serializer = DistrictSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        district_id = serializer.validated_data.get('id')
        district_name = serializer.validated_data.get('nombre')
        city_id = serializer.validated_data.get('provincia')

        district, created = self.district_repository.create_if_not_exists(district_id, district_name, city_id)

        if created:
            return Response({'message':'Localidad creada exitosamente'}, status=status.HTTP_201_CREATED)
        return Response({'message':'La localidad ya existe'}, status=status.HTTP_200_OK)