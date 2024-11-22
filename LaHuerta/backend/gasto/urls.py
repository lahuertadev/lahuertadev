from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpenseViewSet

# Crear el router para el ViewSet
router = DefaultRouter()
router.register(r'expense', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
    path('expense/bulk_delete/', ExpenseViewSet.as_view({'delete': 'bulk_delete'}), name='expense-bulk-delete'),
]