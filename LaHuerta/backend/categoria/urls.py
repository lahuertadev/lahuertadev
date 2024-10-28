from django.urls import path
from .views import (
    GetAllCategories
)

urlpatterns = [
    path('category/', GetAllCategories.as_view(), name='get-all-categories'),
]