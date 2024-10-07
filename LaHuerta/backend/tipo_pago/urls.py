from django.urls import path
from .views import (
    GetAllUnitTypes
)

urlpatterns = [
    path('payment_type/', GetAllUnitTypes.as_view(), name='get-all-payment-types'),
]