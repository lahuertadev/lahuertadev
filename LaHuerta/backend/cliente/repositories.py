from .models import Cliente
from .interfaces import IClientRepository

class ClientRepository(IClientRepository):
    
    def get_all_clients(self):
        return Cliente.objects.prefetch_related('dias_entrega').all() #! Retorna los elementos de la relacion + los clientes