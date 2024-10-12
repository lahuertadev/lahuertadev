from django.urls import path
from .views import (
    GetAllPayments
)

urlpatterns = [
    path('payment/', GetAllPayments.as_view(), name='get-all-payments'),
]