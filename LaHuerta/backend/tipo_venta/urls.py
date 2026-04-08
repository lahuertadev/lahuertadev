from django.urls import path
from .views import GetAllSaleTypes

urlpatterns = [
    path('sale_types/', GetAllSaleTypes.as_view(), name='get-all-sale-types'),
]
