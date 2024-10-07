from django.urls import path
from .views import (
    GetAllContainerTypes
)

urlpatterns = [
    path('container_type/', GetAllContainerTypes.as_view(), name='get-all-container-types'),
]