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
    path('expense/', ExpensesListAPIView.as_view(), name='expense-list'),
    path('expense/create/', CreateExpensesAPIView.as_view(), name='expense-create'),
    path('expense/type_expense/<int:type_expense_id>/', ExpensesByExpenseTypeIdAPIView.as_view(), name='expense-by-type'),
    path('expense/<int:id>/modify/', ModifyExpenseAPIView.as_view(), name='expense-modify'),
    path('expense/<int:id>/delete/', DeleteExpenseAPIView.as_view(), name='expense-delete'),
    path('expense/<str:start_date>/<str:end_date>/', GetExpensesByDateAPIView.as_view(), name='expense-filter-date'),
]