from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError

from .repositories import MarketRepository
from .interfaces import IMarketRepository
from .serializers import MarketSerializer, MarketCreateSerializer, MarketUpdateSerializer
from .exceptions import MarketNotFoundException, MarketDescriptionAlreadyExistsException


class MarketViewSet(ViewSet):
    '''
    Gestión de mercados.
    '''

    def __init__(self, repository: IMarketRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.market_repository = repository or MarketRepository()

    def list(self, request):
        '''
        Obtiene todos los mercados.
        '''
        try:
            markets = self.market_repository.get_all_markets()
            return Response(MarketSerializer(markets, many=True).data, status=status.HTTP_200_OK)

        except Exception:
            return Response(
                {'detail': 'Error al obtener los mercados.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de un mercado por id.
        '''
        try:
            market = self.market_repository.get_market_by_id(pk)
            if not market:
                raise MarketNotFoundException('Mercado no encontrado.')

            return Response(MarketSerializer(market).data, status=status.HTTP_200_OK)

        except MarketNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al obtener el mercado.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        '''
        Crea un nuevo mercado.
        '''
        try:
            serializer = MarketCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            market = self.market_repository.create_market(serializer.validated_data)
            return Response(MarketSerializer(market).data, status=status.HTTP_201_CREATED)

        except MarketDescriptionAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'La descripción del mercado ya se encuentra registrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        '''
        Actualiza un mercado.
        '''
        try:
            market = self.market_repository.get_market_by_id(pk)
            if not market:
                raise MarketNotFoundException('Mercado no encontrado.')

            serializer = MarketUpdateSerializer(market, data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated = self.market_repository.modify_market(market, serializer.validated_data)
            return Response(MarketSerializer(updated).data, status=status.HTTP_200_OK)

        except MarketNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except MarketDescriptionAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'La descripción del mercado ya se encuentra registrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el mercado.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        '''
        Actualiza parcialmente un mercado.
        '''
        try:
            market = self.market_repository.get_market_by_id(pk)
            if not market:
                raise MarketNotFoundException('Mercado no encontrado.')

            serializer = MarketUpdateSerializer(market, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated = self.market_repository.modify_market(market, serializer.validated_data)
            return Response(MarketSerializer(updated).data, status=status.HTTP_200_OK)

        except MarketNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except MarketDescriptionAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'La descripción del mercado ya se encuentra registrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el mercado.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        '''
        Elimina un mercado.
        '''
        try:
            market = self.market_repository.get_market_by_id(pk)
            if not market:
                raise MarketNotFoundException('Mercado no encontrado.')

            self.market_repository.delete_market(market)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except MarketNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al eliminar el mercado.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
