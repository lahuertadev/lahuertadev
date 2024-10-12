from django.urls import path
from .views import (
    GetAllBanks
)

urlpatterns = [
    path('bank/', GetAllBanks.as_view(), name='get-all-banks'),
]