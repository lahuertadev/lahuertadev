from .models import Cliente
from .interfaces import IClientRepository

class ClientRepository(IClientRepository):
    
    def get_all_clients(self):
        return Cliente.objects.all()