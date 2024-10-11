from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import SupplierRepository
from .serializers import SupplierSerializer

class GetAllSuppliers(APIView):
    '''
    Lista todos los proveedores
    '''
    def __init__(self, supplier_repository = None):
        self.supplier_repository = supplier_repository or SupplierRepository()

    def get(self, request):
        try:
            suppliers = self.supplier_repository.get_all_suppliers()
            serializer = SupplierSerializer(suppliers, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)