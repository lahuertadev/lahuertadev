import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import TutorialRepository
from .interfaces import ITutorialRepository
from .serializers import TutorialResponseSerializer, TutorialProgressResponseSerializer
from .constants import TutorialStatus
from .exceptions import TutorialNotFoundException
from .factory import build_tutorial_service

logger = logging.getLogger(__name__)


class TutorialViewSet(viewsets.ViewSet):
    '''
    Tutoriales guiados del usuario logueado (con sus pasos y su avance). El `pk` de la ruta es la
    clave del tutorial.
    '''

    lookup_value_regex = '[^/]+'

    def __init__(self, repository: ITutorialRepository = None, service=None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or TutorialRepository()
        self.service = service or build_tutorial_service(tutorial_repository=self.repository)

    def list(self, request):
        try:
            tutorials = self.repository.get_visible_for_user(request.user)
            serializer = TutorialResponseSerializer(tutorials, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Error al listar los tutoriales")
            return Response({'detail': 'Error al obtener los tutoriales.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _change_status(self, request, pk, new_status):
        try:
            record = self.service.change_status(pk, request.user, new_status)
            return Response(TutorialProgressResponseSerializer(record).data, status=status.HTTP_200_OK)

        except TutorialNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            logger.exception("Error al marcar el tutorial %s como %s", pk, new_status)
            return Response({'detail': 'Error al guardar el avance del tutorial.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        return self._change_status(request, pk, TutorialStatus.STARTED)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        return self._change_status(request, pk, TutorialStatus.COMPLETED)

    @action(detail=True, methods=['post'], url_path='skip')
    def skip(self, request, pk=None):
        return self._change_status(request, pk, TutorialStatus.SKIPPED)
