from django.urls import path
from .views import (
    GetAllPaymentTypes
)

urlpatterns = [
    path('payment_type/', GetAllPaymentTypes.as_view(), name='get-all-payment-types'),
]