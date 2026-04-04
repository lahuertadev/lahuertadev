from django.urls import path
from .views import PurchasePaymentViewSet

purchase_payment_list   = PurchasePaymentViewSet.as_view({'get': 'list',   'post': 'create'})
purchase_payment_detail = PurchasePaymentViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'})

urlpatterns = [
    path('purchase-payment/',      purchase_payment_list,   name='purchase-payment-list'),
    path('purchase-payment/<int:pk>/', purchase_payment_detail, name='purchase-payment-detail'),
]
