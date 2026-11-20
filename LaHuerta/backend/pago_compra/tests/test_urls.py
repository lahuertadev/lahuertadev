from django.urls import reverse, resolve
from pago_compra.views import PurchasePaymentViewSet


class TestPurchasePaymentUrls:
    def test_cancel_url_resuelve_correctamente(self):
        assert reverse('purchase-payment-cancel', kwargs={'pk': 1}) == '/api/purchase-payment/1/cancel/'

    def test_cancel_url_mapea_post_a_la_accion_cancel(self):
        resolved = resolve('/api/purchase-payment/1/cancel/')
        assert resolved.func.cls == PurchasePaymentViewSet
        assert resolved.func.actions == {'post': 'cancel'}

    def test_detalle_no_acepta_delete(self):
        # Un pago no se elimina: se anula con POST .../cancel/.
        resolved = resolve('/api/purchase-payment/1/')
        assert 'delete' not in resolved.func.actions
