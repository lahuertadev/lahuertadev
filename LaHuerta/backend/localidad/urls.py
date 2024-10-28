from django.urls import path
from .views import (
    GetAllTowns
)

urlpatterns = [
    path('town/', GetAllTowns.as_view(), name='get-all-towns'),
]