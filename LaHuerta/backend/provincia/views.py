from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .serializers import ProvinceSerializer
from .repositories import ProvinceRepository

class ProvinceViewSet(viewsets.ModelViewSet):
    province_repository = ProvinceRepository()
    serializer_class = ProvinceSerializer

    def get_queryset(self):
        """
        Sobrescribe el método para utilizar el repositorio.
        """
        return self.province_repository.get_all_provinces()
    
    @action(detail=False, methods=['post'])
    def create_if_not_exists(self, request):
        serializer = ProvinceSerializer(data=request.data)

        province_id = request.data.get('id')
        province_name = request.data.get('nombre') 

        existing_province = self.province_repository.get_province_by_id(province_id)

        if existing_province:
            return Response({'message':'La provincia ya existe'}, status=status.HTTP_200_OK)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.province_repository.create_province(province_id, province_name)
        return Response({'message':'Provincia creada exitosamente'}, status=status.HTTP_201_CREATED)
        
