from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import TipoVenta
from .serializers import SaleTypeSerializer


class GetAllSaleTypes(APIView):
    '''
    Lista todos los tipos de venta (unidad, bulto).
    '''
    def get(self, request):
        try:
            sale_types = TipoVenta.objects.all()
            serializer = SaleTypeSerializer(sale_types, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
