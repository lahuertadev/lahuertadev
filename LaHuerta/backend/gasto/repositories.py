from .models import Gasto
from .interfaces import IExpenseRepository

class ExpenseRepository(IExpenseRepository):
    def get_expenses_by_type_expenses_id(self, tipo_gasto_id):
        return Gasto.objects.filter(tipo_gasto_id=tipo_gasto_id)
    
    def get_all_expenses(self):
        return Gasto.objects.all()
    
    def create_expense(self, data):
        expense = Gasto(**data)
        expense.save()

    def modify_expense(self, id, data):
        expense = self.find_expense_by_id(id)
        if not expense:
            raise Gasto.DoesNotExist()
        expense.fecha = data.get('fecha', expense.fecha)
        expense.importe = data.get('importe', expense.importe)
        expense.tipo_gasto = data.get('tipo_gasto', expense.tipo_gasto)

        #! Otra forma de hacerlo: 
        # for key, value in data.items():
        #     setattr(expense, key, value)
        expense.save()

    def delete_expense(self, id):
        expense = self.find_expense_by_id(id)
        if not expense:
            raise Gasto.DoesNotExist()
        expense.delete()
            
    def find_expense_by_id(self, expense_id):
        return Gasto.objects.filter(id=expense_id).first()