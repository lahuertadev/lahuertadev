from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientReportViewSet


router = DefaultRouter()
router.register(r'client-report', ClientReportViewSet, basename='client-report')

urlpatterns = [
    path('', include(router.urls)),
]
