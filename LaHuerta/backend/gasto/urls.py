from django.urls import path
from .views import (
    ExpensesListAPIView, 
    CreateExpensesAPIView, 
    ExpensesByExpenseTypeIdAPIView, 
    ModifyExpenseAPIView,
    DeleteExpenseAPIView
    ) 

urlpatterns = [
    path('gastos/', ExpensesListAPIView.as_view(), name='expense-list'),
    path('gastos/create/', CreateExpensesAPIView.as_view(), name='expense-create'),
    path('gastos/tipo/<int:tipo_gasto_id>/', ExpensesByExpenseTypeIdAPIView.as_view(), name='expense-by-type'),
    path('gastos/<int:id>/modify/', ModifyExpenseAPIView.as_view(), name='expense-modify'),
    path('gastos/<int:id>/delete/', DeleteExpenseAPIView.as_view(), name='expense-delete'),
]