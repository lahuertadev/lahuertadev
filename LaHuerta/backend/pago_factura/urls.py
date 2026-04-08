from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BillPaymentViewSet

router = DefaultRouter()
router.register(r'bill-payment', BillPaymentViewSet, basename='bill-payment')

urlpatterns = [
    path('', include(router.urls)),
]
