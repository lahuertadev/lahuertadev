from .models import Gasto
from .interfaces import IExpenseRepository
from django.db.models import CharField
from django.db.models.functions import Cast

class ExpenseRepository(IExpenseRepository):
    def get_expenses_by_type_expenses_id(self, tipo_gasto_id):
        return Gasto.objects.filter(tipo_gasto_id=tipo_gasto_id)
    
    def get_all_expenses(self, amount=None, date=None, expense_type=None):
        expenses = Gasto.objects.all() #* En caso de que no se pase ningún dato, trae todo

        if amount is not None:
            expenses = expenses.filter(importe=amount)
        if date is not None:
            expenses = expenses.filter(fecha=date)
        if expense_type is not None:
            expenses = expenses.filter(tipo_gasto__descripcion__icontains=expense_type)
            
        return expenses
    
    def create_expense(self, data):
        expense = Gasto(**data)
        expense.save()

    def modify_expense(self, id, data):
        expense = self.get_expense_by_id(id)
        if not expense:
            raise Gasto.DoesNotExist()
        expense.fecha = data.get('fecha', expense.fecha)
        expense.importe = data.get('importe', expense.importe)
        expense.tipo_gasto = data.get('tipo_gasto', expense.tipo_gasto)

        #! Otra forma de hacerlo: 
        # for key, value in data.items():
        #     setattr(expense, key, value)
        expense.save()

    def delete_expense(self, ids):
        expenses = Gasto.objects.filter(id__in=ids)
        if not expenses.exists():
            raise Gasto.DoesNotExist()
        expenses.delete()

    def get_expenses_filtered_by_date(self, start_date, end_date):
        return Gasto.objects.filter(fecha__range=[start_date, end_date])
         
    def get_expense_by_id(self, expense_id):
        return Gasto.objects.filter(id=expense_id).first()