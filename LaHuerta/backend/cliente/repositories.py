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
    
    def get_client_by_cuit(self, cuit):
        return Cliente.objects.filter(cuit=cuit).first()
    
    def get_client_by_id(self, id):
        return Cliente.objects.filter(id=id).first()

    def create_client(self, data):
        client = Cliente(**data)
        client.save()
        return client
    
    def modify_client(self, pk, data):
        client = self.get_client_by_id(pk)

        if not client:
            raise ValueError(f'No se encontró el cliente con el id {pk}')
        
        allowed_fields_to_edit = {
            'cuenta_corriente', 
            'domicilio', 
            'localidad', 
            'tipo_facturacion', 
            'condicion_IVA', 
            'telefono', 
            'fecha_inicio_ventas', 
            'nombre_fantasia' 
        }
        for key, value in data.items():
            setattr(client, key, value)
        client.save()

# id = models.SmallAutoField(primary_key=True)
#     cuit = models.CharField(max_length=11, unique=True)
#     razon_social = models.CharField(max_length=70, unique=True)
#     cuenta_corriente = models.DecimalField(max_digits=10, decimal_places=2)
#     domicilio = models.CharField(max_length=200, blank=True, null=True)
#     localidad = models.ForeignKey(Localidad, on_delete=models.CASCADE)
#     tipo_facturacion = models.ForeignKey(TipoFacturacion, on_delete=models.CASCADE)
#     condicion_IVA = models.ForeignKey(TipoCondicionIva, on_delete=models.CASCADE)
#     telefono = models.CharField(max_length=16)
#     fecha_inicio_ventas = models.DateField(blank=True, null=True)
#     nombre_fantasia = models.CharField(max_length=100, blank=True, null=True)
#     estado = models.BooleanField(default=True)