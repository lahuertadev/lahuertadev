from rest_framework import viewsets, status
from rest_framework.response import Response

from .factory import build_report_service
from .serializers import ReportQueryParamsSerializer, ClientReportResponseSerializer
from .exceptions import ClientNotFoundException


class ClientReportViewSet(viewsets.ViewSet):
    '''
    Reportes de clientes: facturas, pagos, KPIs y gráfico por período.
    '''

    service = None

    def __init__(self, service=None, **kwargs):
        super().__init__(**kwargs)
        self.service = service or build_report_service()

    def retrieve(self, request, pk=None):
        '''
        Devuelve el reporte de un cliente para el período indicado.
        Query params: period (dia|semana|mes|anio), date (YYYY-MM-DD).
        '''
        params_serializer = ReportQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)

        try:
            report = self.service.get_client_report(
                client_id=pk,
                period=params_serializer.validated_data['period'],
                ref_date=params_serializer.validated_data['date'],
            )
            serializer = ClientReportResponseSerializer(report)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ClientNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al generar el reporte.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
