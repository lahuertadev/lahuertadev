from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientPaymentViewSet

router = DefaultRouter()
router.register(r'client-payment', ClientPaymentViewSet, basename='client-payment')

urlpatterns = [
    path('', include(router.urls)),
]
