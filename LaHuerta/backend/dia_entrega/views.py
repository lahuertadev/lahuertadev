from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import DeliveryDayRepository
from .serializers import DeliveryDaysSerializer

class GetDeliveryDays(APIView):
    '''
    Lista todos los dias de entrega
    '''
    def __init__(self, delivery_day_repository = None):
        self.delivery_day_repository = delivery_day_repository or DeliveryDayRepository()

    def get(self, request):
        try:
            days = self.delivery_day_repository.get_all_delivery_days()
            serializer = DeliveryDaysSerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)