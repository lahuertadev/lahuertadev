from .models import Banco
from .interfaces import IBankRepository

class BankRepository(IBankRepository):
    
    def get_all_banks(self):
        '''
        Obtiene todos los bancos.
        '''
        return Banco.objects.all()