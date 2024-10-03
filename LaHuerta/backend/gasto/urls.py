from django.urls import path
from .views import (
    ExpensesListAPIView, 
    CreateExpensesAPIView, 
    ExpensesByExpenseTypeIdAPIView, 
    ModifyExpenseAPIView,
    DeleteExpenseAPIView,
    GetExpensesByDateAPIView
    ) 

urlpatterns = [
    path('gastos/', ExpensesListAPIView.as_view(), name='expense-list'),
    path('gastos/create/', CreateExpensesAPIView.as_view(), name='expense-create'),
    path('gastos/type_expense/<int:type_expense_id>/', ExpensesByExpenseTypeIdAPIView.as_view(), name='expense-by-type'),
    path('gastos/<int:id>/modify/', ModifyExpenseAPIView.as_view(), name='expense-modify'),
    path('gastos/<int:id>/delete/', DeleteExpenseAPIView.as_view(), name='expense-delete'),
    path('gastos/<str:start_date>/<str:end_date>/', GetExpensesByDateAPIView.as_view(), name='expense-filter-date'),
]