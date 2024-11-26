from .models import Cliente
from .interfaces import IClientRepository
from django.db.models import Q

class ClientRepository(IClientRepository):

    def get_all_clients(self, cuit=None, searchQuery=None, address=None):
        queryset = Cliente.objects.all()

        if cuit:
            queryset = queryset.filter(cuit__icontains=cuit)

        if searchQuery:
            queryset = queryset.filter(
                Q(razon_social__icontains=searchQuery) |
                Q(nombre_fantasia__icontains=searchQuery)
            )

        if address:
            queryset = queryset.filter(
                Q(domicilio__icontains=address) |
                Q(localidad__descripcion__icontains=address) 
            )

        return queryset