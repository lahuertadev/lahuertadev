from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PriceListProductViewSet


router = DefaultRouter()
router.register(r"price_list_product", PriceListProductViewSet, basename="price_list_product")


urlpatterns = [
    path("", include(router.urls)),
]

