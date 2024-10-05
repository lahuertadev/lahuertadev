from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import TypeConditionIvaRepository
from .serializers import TypeConditionIvaSerializer

class GetTypesIvaConditionAPIView(APIView):
    '''
    Lista todos los tipos de condicion IVA
    '''
    def __init__(self, type_condition_iva_repository = None):
        self.type_condition_iva_repository = type_condition_iva_repository or TypeConditionIvaRepository()

    def get(self, request):
        try:
            types_condition_iva = self.type_condition_iva_repository.get_all_type_condition_iva()
            serializer = TypeConditionIvaSerializer(types_condition_iva, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)