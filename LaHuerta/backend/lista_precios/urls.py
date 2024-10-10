from django.urls import path
from .views import (
    GetAllPricesList
)

urlpatterns = [
    path('product_list/', GetAllPricesList.as_view(), name='get-all-products_list'),
]