from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError, transaction

from contacto.constants import SUPPLIER_OWNER
from contacto.exceptions import ContactNotFoundException, ContactRequiredException
from contacto.factory import build_contact_service
from .repositories import SupplierRepository
from .interfaces import ISupplierRepository
from .serializers import (
    SupplierSerializer,
    SupplierCreateSerializer,
    SupplierUpdateSerializer,
    SupplierQueryParamsSerializer,
)
from .exceptions import SupplierNotFoundException, SupplierNameAlreadyExistsException
import logging

logger = logging.getLogger(__name__)


class SupplierViewSet(ViewSet):
    '''
    Gestión de proveedores.
    '''

    def __init__(self, repository: ISupplierRepository = None, contact_service=None, **kwargs):
        super().__init__(**kwargs)
        self.supplier_repository = repository or SupplierRepository()
        self.contact_service = contact_service or build_contact_service()

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
            logger.exception("Error al listar proveedores")
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
            logger.exception("Error al obtener proveedor pk=%s", pk)
            return Response(
                {'detail': 'Error al obtener el proveedor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        '''
        Crea un nuevo proveedor. La cuenta corriente inicial es opcional
        (por defecto 0) y puede indicarse en la creación.
        '''
        try:
            serializer = SupplierCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            data = dict(serializer.validated_data)
            contacts = data.pop('contactos')
            with transaction.atomic():
                supplier = self.supplier_repository.create_supplier(data)
                self.contact_service.sync_contacts(SUPPLIER_OWNER, supplier, contacts)
            return Response(SupplierSerializer(supplier).data, status=status.HTTP_201_CREATED)

        except (SupplierNameAlreadyExistsException, ContactNotFoundException, ContactRequiredException) as e:
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
        Actualiza un proveedor, incluyendo la cuenta corriente.
        '''
        try:
            supplier = self.supplier_repository.get_supplier_by_id(pk)
            if not supplier:
                raise SupplierNotFoundException('Proveedor no encontrado.')

            serializer = SupplierUpdateSerializer(supplier, data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated = self._save_supplier(supplier, serializer.validated_data)
            return Response(SupplierSerializer(updated).data, status=status.HTTP_200_OK)

        except SupplierNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except (SupplierNameAlreadyExistsException, ContactNotFoundException, ContactRequiredException) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'El nombre del proveedor ya se encuentra registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            logger.exception("Error al actualizar proveedor pk=%s", pk)
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

            updated = self._save_supplier(supplier, serializer.validated_data)
            return Response(SupplierSerializer(updated).data, status=status.HTTP_200_OK)

        except SupplierNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except (SupplierNameAlreadyExistsException, ContactNotFoundException, ContactRequiredException) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'El nombre del proveedor ya se encuentra registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            logger.exception("Error al actualizar proveedor pk=%s", pk)
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
            logger.exception("Error al eliminar proveedor pk=%s", pk)
            return Response(
                {'detail': 'Error al eliminar el proveedor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _save_supplier(self, supplier, validated_data):
        data = dict(validated_data)
        contacts = data.pop('contactos', None)
        with transaction.atomic():
            updated = self.supplier_repository.modify_supplier(supplier, data)
            if contacts is not None:
                self.contact_service.sync_contacts(SUPPLIER_OWNER, updated, contacts)
        return updated
