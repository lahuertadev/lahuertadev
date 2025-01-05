from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UnitTypeViewSet

router = DefaultRouter()
router.register(r'unit_type', UnitTypeViewSet, basename='unit_type')

urlpatterns = [
    path('', include(router.urls)),
]