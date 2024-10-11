from django.urls import path
from .views import (
    GetAllBuys
)

urlpatterns = [
    path('buy/', GetAllBuys.as_view(), name='get-all-buys'),
]