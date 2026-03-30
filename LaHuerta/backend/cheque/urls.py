from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CheckViewSet

router = DefaultRouter()
router.register(r'checks', CheckViewSet, basename='checks')

urlpatterns = [
    path('', include(router.urls)),
]
