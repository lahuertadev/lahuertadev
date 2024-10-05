from django.urls import path
from .views import (
    GetTypesIvaConditionAPIView
)

urlpatterns = [
    path('type_condition_iva/', GetTypesIvaConditionAPIView.as_view(), name='get-types-condition-iva'),
]