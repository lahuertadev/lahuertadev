import pytest
from django.urls import reverse, resolve
from reporte.views import ClientReportViewSet


class TestClientReportUrls:
    def test_retrieve_url_resuelve_correctamente(self):
        url = reverse('client-report-detail', kwargs={'pk': 1})
        assert url == '/api/client-report/1/'

    def test_retrieve_url_apunta_al_viewset_correcto(self):
        resolved = resolve('/api/client-report/1/')
        assert resolved.func.cls == ClientReportViewSet

    def test_retrieve_url_mapea_accion_retrieve(self):
        resolved = resolve('/api/client-report/1/')
        assert 'get' in resolved.func.actions
        assert resolved.func.actions['get'] == 'retrieve'
