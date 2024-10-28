from django.urls import path
from .views import (
    GetAllBillTypes
)

urlpatterns = [
    path('bill_types/', GetAllBillTypes.as_view(), name='get-all-bill-types'),
]