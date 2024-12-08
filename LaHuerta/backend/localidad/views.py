from rest_framework.decorators import action
from rest_framework import status, viewsets
from rest_framework.response import Response
from .serializers import DistrictCreateUpdateSerializer, DistrictResponseSerializer
from .services import DistrictService 
from .repositories import DistrictRepository

class DistrictViewSet(viewsets.ModelViewSet):
    serializer_class = DistrictCreateUpdateSerializer
    district_service = DistrictService() 

    def get_queryset(self):
        return DistrictRepository().get_all_districts()

    @action(detail=False, methods=['post'])
    def create_if_not_exists(self, request):
        """
        Crear un distrito si no existe, utilizando el servicio.
        """

        district_data = request.data
        result = self.district_service.create_or_get_district(district_data)
        http_status = result.pop('http_status')
        district = result.get('district')
        if district:
            result['district'] = DistrictResponseSerializer(district).data
        return Response(result, status=http_status)