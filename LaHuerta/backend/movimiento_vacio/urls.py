from django.urls import path
from .views import EmptyMovementViewSet

empty_movement_list   = EmptyMovementViewSet.as_view({'get': 'list', 'post': 'create'})
empty_movement_detail = EmptyMovementViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

urlpatterns = [
    path('empty-movement/', empty_movement_list, name='empty-movement-list'),
    path('empty-movement/<int:pk>/', empty_movement_detail, name='empty-movement-detail'),
]
