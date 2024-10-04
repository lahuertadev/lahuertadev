from django.urls import path
from .views import (
    GetTypeFacturationAPIView
)

urlpatterns = [
    path('type_facturation/', GetTypeFacturationAPIView.as_view(), name='get-facturation_types'),
]