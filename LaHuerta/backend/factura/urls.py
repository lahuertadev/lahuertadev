from django.urls import path
from .views import (
    GetAllBills
)

urlpatterns = [
    path('bill/', GetAllBills.as_view(), name='get-all-bills'),
]