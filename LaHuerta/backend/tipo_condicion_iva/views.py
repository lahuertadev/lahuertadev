from rest_framework import status
from rest_framework.response import Response
from .repositories import ConditionIvaTypeRepository
from .serializers import ConditionIvaTypeSerializer
from .interfaces import IConditionIvaTypeRepository
from rest_framework.viewsets import ViewSet
from django.core.exceptions import ObjectDoesNotExist
from autenticacion.permissions import IsAdministratorOrReadOnly

class ConditionIvaTypeViewSet(ViewSet):
    """
    ViewSet para gestionar Tipos de Condición IVA.
    Solo administradores y superusuarios pueden crear/editar/eliminar.
    Todos los usuarios autenticados pueden ver.
    """
    permission_classes = [IsAdministratorOrReadOnly]  

    def __init__(self, repository: IConditionIvaTypeRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or ConditionIvaTypeRepository()

    def list(self, request):
        try:
            items = self.repository.get_all()
            serializer = ConditionIvaTypeSerializer(items, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception:
            return Response(
                {'detail':'Error al obtener las condiciones de IVA'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, pk=None):
        try:
            item = self.repository.get_by_id(pk)
            serializer = ConditionIvaTypeSerializer(item)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ObjectDoesNotExist:
            return Response(
                {'detail':'Tipo Condición IVA no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        except Exception:
            return Response(
                {'detail':'Error al obtener la condición de IVA'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request):
        serializer = ConditionIvaTypeSerializer(data=request.data)

        if serializer.is_valid():
            try:
                self.repository.create(serializer.validated_data)
                return Response(
                    serializer.validated_data, 
                    status=status.HTTP_201_CREATED
                )
            except Exception:
                return Response(
                    {'detail':'Error al crear un Tipo Condición IVA'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def update(self, request, pk=None):
        serializer = ConditionIvaTypeSerializer(data=request.data)

        if serializer.is_valid():
            try:
                self.repository.update(pk, serializer.validated_data)
                return Response(status=status.HTTP_200_OK)
            except ObjectDoesNotExist:
                return Response(
                    {'detail':'Tipo de Condición IVA no encontado.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            except Exception:
                return Response(
                    {'detail':'Error al actualizar el tipo de Condición IVA'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def destroy(self, request, pk=None):
        try:
            self.repository.delete(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        except ObjectDoesNotExist:
            return Response(
                {'detail':'Tipo de Condición IVA no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
        except Exception:
            return Response(
                {'detail':'Error al eliminar un Tipo de Condición IVA'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

