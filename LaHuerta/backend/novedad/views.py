import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import NewsRepository
from .interfaces import INewsRepository
from .serializers import NewsResponseSerializer, NewsQueryParamsSerializer
from .exceptions import NewsNotFoundException
from .factory import build_news_service

logger = logging.getLogger(__name__)


class NewsViewSet(viewsets.ViewSet):
    '''
    Novedades de la plataforma para el usuario logueado.
    '''

    def __init__(self, repository: INewsRepository = None, service=None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or NewsRepository()
        self.service = service or build_news_service(news_repository=self.repository)

    def list(self, request):
        '''
        Con `pending=true` devuelve las del Inicio (vigentes y no vistas); sin él, el historial completo.
        '''
        params_serializer = NewsQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)

        try:
            news = self.repository.get_visible_for_user(
                request.user,
                pending=params_serializer.validated_data.get('pending'),
            )
            serializer = NewsResponseSerializer(news, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Error al listar novedades")
            return Response({'detail': 'Error al obtener las novedades.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='mark-seen')
    def mark_seen(self, request, pk=None):
        try:
            self.service.mark_as_seen(pk, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except NewsNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            logger.exception("Error al marcar como vista la novedad pk=%s", pk)
            return Response({'detail': 'Error al marcar la novedad como vista.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
