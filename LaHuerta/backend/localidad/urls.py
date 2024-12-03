from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DistrictViewSet


router = DefaultRouter()
router.register(r'district', DistrictViewSet, basename='district')

urlpatterns = [
    path('', include(router.urls)),
]