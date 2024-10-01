from django.urls import path
from .views import ExpensesListAPIView, CreateExpensesAPIView, ExpensesByExpenseTypeIdAPIView, ModifyExpenseAPIView

urlpatterns = [
    path('gastos/', ExpensesListAPIView.as_view(), name='gastos-list'),
    path('gastos/create/', CreateExpensesAPIView.as_view(), name='gastos-create'),
    path('gastos/tipo/<int:tipo_gasto_id>/', ExpensesByExpenseTypeIdAPIView.as_view(), name='gastos-por-tipo'),
    path('gastos/<int:id>/modify/', ModifyExpenseAPIView.as_view(), name='gastos-modify'),
]