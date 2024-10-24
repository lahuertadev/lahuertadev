from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import CheckRepository
from .serializers import CheckSerializer

class GetAllChecks(APIView):
    '''
    Muestra todos los cheques
    '''
    def __init__(self, check_repository = None):
        self.check_repository = check_repository or CheckRepository()

    def get(self, request):
        try:
            checks = self.check_repository.get_all_checks()
            serializer = CheckSerializer(checks, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)