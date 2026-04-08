from .models import Banco
from .interfaces import IBankRepository


class BankRepository(IBankRepository):

    def get_all_banks(self):
        return Banco.objects.all()

    def get_bank_by_id(self, id):
        return Banco.objects.filter(id=id).first()

    def create_bank(self, data):
        bank = Banco(**data)
        bank.save()
        return bank

    def modify_bank(self, bank, data):
        for key, value in data.items():
            setattr(bank, key, value)
        bank.save()
        return bank

    def delete_bank(self, bank):
        bank.delete()