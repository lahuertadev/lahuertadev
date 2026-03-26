from django.urls import path
from .views import BuyViewSet

buy_list    = BuyViewSet.as_view({'get': 'list', 'post': 'create'})
buy_detail  = BuyViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

urlpatterns = [
    path('buy/', buy_list, name='buy-list'),
    path('buy/<int:pk>/', buy_detail, name='buy-detail'),
]
