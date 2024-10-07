from django.urls import path
from .views import (
    GetAllMarkets
)

urlpatterns = [
    path('market/', GetAllMarkets.as_view(), name='get-all-markets'),
]