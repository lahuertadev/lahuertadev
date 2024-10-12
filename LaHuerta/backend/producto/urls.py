from django.urls import path
from .views import (
    GetAllProducts
)

urlpatterns = [
    path('product/', GetAllProducts.as_view(), name='get-all-products'),
]