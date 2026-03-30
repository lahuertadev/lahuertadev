from django.urls import path
from .views import CheckStateListView

urlpatterns = [
    path('check_state/', CheckStateListView.as_view(), name='check-state-list'),
]
