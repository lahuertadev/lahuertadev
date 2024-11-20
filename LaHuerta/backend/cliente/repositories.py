from .models import Cliente
from .interfaces import IClientRepository
from django.db.models import Q

class ClientRepository(IClientRepository):

    def get_all_clients(self, filters=None):
        queryset = Cliente.objects.all()

        if filters.get('cuit'):
            queryset = queryset.filter(cuit__icontains=filters['cuit'])

        if filters.get('searchQuery'):
            queryset = queryset.filter(
                Q(razon_social__icontains=filters['searchQuery']) |
                Q(nombre_fantasia__icontains=filters['searchQuery'])
            )

        if filters.get('address'):
            queryset = queryset.filter(
                Q(domicilio__icontains=filters['address']) |
                Q(localidad__descripcion__icontains=filters['address']) 
            )

        return queryset