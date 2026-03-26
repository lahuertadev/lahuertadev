from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError

from .repositories import BankRepository
from .interfaces import IBankRepository
from .serializers import BankSerializer, BankCreateSerializer, BankUpdateSerializer
from .exceptions import BankNotFoundException, BankDescriptionAlreadyExistsException


class BankViewSet(ViewSet):
    '''
    Gestión de bancos.
    '''

    def __init__(self, repository: IBankRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.bank_repository = repository or BankRepository()

    def list(self, request):
        '''
        Obtiene todos los bancos.
        '''
        try:
            banks = self.bank_repository.get_all_banks()
            return Response(BankSerializer(banks, many=True).data, status=status.HTTP_200_OK)

        except Exception:
            return Response(
                {'detail': 'Error al obtener los bancos.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de un banco por id.
        '''
        try:
            bank = self.bank_repository.get_bank_by_id(pk)
            if not bank:
                raise BankNotFoundException('Banco no encontrado.')

            return Response(BankSerializer(bank).data, status=status.HTTP_200_OK)

        except BankNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al obtener el banco.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        '''
        Crea un nuevo banco.
        '''
        try:
            serializer = BankCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            bank = self.bank_repository.create_bank(serializer.validated_data)
            return Response(BankSerializer(bank).data, status=status.HTTP_201_CREATED)

        except BankDescriptionAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'La descripción del banco ya se encuentra registrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        '''
        Actualiza un banco.
        '''
        try:
            bank = self.bank_repository.get_bank_by_id(pk)
            if not bank:
                raise BankNotFoundException('Banco no encontrado.')

            serializer = BankUpdateSerializer(bank, data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated = self.bank_repository.modify_bank(bank, serializer.validated_data)
            return Response(BankSerializer(updated).data, status=status.HTTP_200_OK)

        except BankNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except BankDescriptionAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'La descripción del banco ya se encuentra registrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el banco.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        '''
        Actualiza parcialmente un banco.
        '''
        try:
            bank = self.bank_repository.get_bank_by_id(pk)
            if not bank:
                raise BankNotFoundException('Banco no encontrado.')

            serializer = BankUpdateSerializer(bank, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated = self.bank_repository.modify_bank(bank, serializer.validated_data)
            return Response(BankSerializer(updated).data, status=status.HTTP_200_OK)

        except BankNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except BankDescriptionAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response(
                {'detail': 'La descripción del banco ya se encuentra registrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el banco.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        '''
        Elimina un banco.
        '''
        try:
            bank = self.bank_repository.get_bank_by_id(pk)
            if not bank:
                raise BankNotFoundException('Banco no encontrado.')

            self.bank_repository.delete_bank(bank)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except BankNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al eliminar el banco.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )