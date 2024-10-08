from django.urls import path
from .views import (
    GetAllClients
)

urlpatterns = [
    path('client/', GetAllClients.as_view(), name='get-all-clients'),
]