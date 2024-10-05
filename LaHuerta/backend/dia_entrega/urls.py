from django.urls import path
from .views import (
    GetDeliveryDays
)

urlpatterns = [
    path('delivery_days/', GetDeliveryDays.as_view(), name='get-delivery-days'),
]