from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContainerTypeViewSet

router = DefaultRouter()
router.register(r'container_type', ContainerTypeViewSet, basename='container_type')

urlpatterns = [
    path('', include(router.urls)),
]