from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PricesListViewSet

router = DefaultRouter()
router.register(r"price_list", PricesListViewSet, basename="price_list")

urlpatterns = [
    path("", include(router.urls)),
]