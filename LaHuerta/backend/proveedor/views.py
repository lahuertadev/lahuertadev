from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError

from .repositories import SupplierRepository
from .interfaces import ISupplierRepository
from .serializers import (
    SupplierSerializer,
    SupplierCreateSerializer,
    SupplierUpdateSerializer,
    SupplierQueryParamsSerializer,
)
from .exceptions import SupplierNotFoundException, SupplierNameAlreadyExistsException


class SupplierViewSet(ViewSet):
    '''
    Gestión de proveedores.
    '''

    def __init__(self, repository: ISupplierRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.supplier_repository = repository or SupplierRepository()

    def list(self, request):
        '''
        Obtiene todos los proveedores. Acepta filtro por searchQuery.
        '''
        serializer = SupplierQueryParamsSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            suppliers = self.supplier_repository.get_all_suppliers(
                searchQuery=serializer.validated_data.get('searchQuery'),
                mercado=serializer.validated_data.get('mercado'),
            )
            return Response(SupplierSerializer(suppliers, many=True).data, status=status.HTTP_200_OK)

        except Exception:
            return Response(
                {'detail': 'Error al obtener los proveedores.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de un proveedor por id.
        '''
        try:
            supplier = self.supplier_repository.get_supplier_by_id(pk)
            if not supplier:
                raise SupplierNotFoundException('Proveedor no encontrado.')

            return Response(SupplierSerializer(supplier).data, status=status.HTTP_200_OK)

        except SupplierNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al obtener el proveedor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        '''
        Crea un nuevo proveedor. La cuenta corriente se inicializa en 0.
        '''
        try:
            serializer = SupplierCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            supplier = self.supplier_repository.create_supplier(serializer.validated_data)
            return Response(SupplierSerializer(supplier).data, status=status.HTTP_201_CREATED)

        except SupplierNameAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'El nombre del proveedor ya se encuentra registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        '''
        Actualiza un proveedor. La cuenta corriente no es modificable por este endpoint.
        '''
        try:
            supplier = self.supplier_repository.get_supplier_by_id(pk)
            if not supplier:
                raise SupplierNotFoundException('Proveedor no encontrado.')

            serializer = SupplierUpdateSerializer(supplier, data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated = self.supplier_repository.modify_supplier(supplier, serializer.validated_data)
            return Response(SupplierSerializer(updated).data, status=status.HTTP_200_OK)

        except SupplierNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except SupplierNameAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'El nombre del proveedor ya se encuentra registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el proveedor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        '''
        Actualiza parcialmente un proveedor.
        '''
        try:
            supplier = self.supplier_repository.get_supplier_by_id(pk)
            if not supplier:
                raise SupplierNotFoundException('Proveedor no encontrado.')

            serializer = SupplierUpdateSerializer(supplier, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated = self.supplier_repository.modify_supplier(supplier, serializer.validated_data)
            return Response(SupplierSerializer(updated).data, status=status.HTTP_200_OK)

        except SupplierNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except SupplierNameAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'El nombre del proveedor ya se encuentra registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el proveedor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        '''
        Elimina un proveedor.
        '''
        try:
            supplier = self.supplier_repository.get_supplier_by_id(pk)
            if not supplier:
                raise SupplierNotFoundException('Proveedor no encontrado.')

            self.supplier_repository.delete_supplier(supplier)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except SupplierNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al eliminar el proveedor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
