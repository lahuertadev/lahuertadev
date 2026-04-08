from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import EstadoCheque
from .serializers import EstadoChequeSerializer


class CheckStateListView(APIView):
    '''
    Lista todos los estados de cheque.
    '''
    def get(self, request):
        try:
            states = EstadoCheque.objects.all()
            serializer = EstadoChequeSerializer(states, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {'detail': 'Error al obtener los estados de cheque.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
