from django.urls import path
from .views import (
    GetAllBillPayments
)

urlpatterns = [
    path('bill_payment/', GetAllBillPayments.as_view(), name='get-all-bill_payments'),
]