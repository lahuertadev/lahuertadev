from django.urls import path
from .views import (
    GetAllSuppliers
)

urlpatterns = [
    path('supplier/', GetAllSuppliers.as_view(), name='get-all-suppliers'),
]