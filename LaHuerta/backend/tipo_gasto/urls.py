from django.urls import path
from .views import (
    CreateTypeExpenseAPIView,
    GetTypeExpensesAPIView
)

urlpatterns = [
    path('type_expense/create/', CreateTypeExpenseAPIView.as_view(), name='create-type-expense'),
    path('type_expense/', GetTypeExpensesAPIView.as_view(), name='get-type-expense'),
]