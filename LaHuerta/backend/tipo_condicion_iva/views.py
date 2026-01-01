from rest_framework import status
from rest_framework.response import Response
from .repositories import ConditionIvaTypeRepository
from .serializers import ConditionIvaTypeSerializer
from .interfaces import IConditionIvaTypeRepository
from rest_framework.viewsets import ViewSet

class ConditionIvaTypeViewSet(ViewSet):

    def __init__(self, repository: IConditionIvaTypeRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or ConditionIvaTypeRepository()

    def list(self, request):
        items = self.repository.get_all()
        serializer = ConditionIvaTypeSerializer(items, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = ConditionIvaTypeSerializer(data=request.data)
        if serializer.is_valid():
            self.repository.create(serializer.validated_data)
            return Response(status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)