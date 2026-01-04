from django.urls import path

from rest_framework.routers import DefaultRouter
from .views import ConditionIvaTypeViewSet

router = DefaultRouter()
router.register(r'type_condition_iva', ConditionIvaTypeViewSet, basename='type_condition_iva')

urlpatterns = router.urls