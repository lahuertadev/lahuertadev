from django.urls import path
from .views import (
    GetAllUnitTypes
)

urlpatterns = [
    path('unit_type/', GetAllUnitTypes.as_view(), name='get-all-unit-types'),
]