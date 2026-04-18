from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OwnCheckViewSet

router = DefaultRouter()
router.register(r'own-checks', OwnCheckViewSet, basename='own-checks')

urlpatterns = [
    path('', include(router.urls)),
]
