from django.urls import path
from .views import CreateTypeExpenseAPIView

urlpatterns = [
    path('tipo_gasto/create/', CreateTypeExpenseAPIView.as_view(), name='tipo-gasto-create'),
]