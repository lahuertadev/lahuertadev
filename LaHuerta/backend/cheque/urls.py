from django.urls import path
from .views import (
    GetAllChecks
    ) 

urlpatterns = [
    path('check/', GetAllChecks.as_view(), name='get-all-checks'),
]