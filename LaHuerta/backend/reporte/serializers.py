from rest_framework import serializers
from cliente.serializers import ClientResponseSerializer
from factura.serializers import BillResponseSerializer
from pago_cliente.serializers import ClientPaymentResponseSerializer
from . import constants as report_constants


class ReportQueryParamsSerializer(serializers.Serializer):
    period = serializers.ChoiceField(choices=report_constants.VALID_PERIODS)
    date = serializers.DateField()


class KpiSerializer(serializers.Serializer):
    total_billed = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_balance = serializers.DecimalField(max_digits=12, decimal_places=2)


class ChartEntrySerializer(serializers.Serializer):
    label = serializers.CharField()
    billed = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid = serializers.DecimalField(max_digits=12, decimal_places=2)


class ClientReportResponseSerializer(serializers.Serializer):
    client = ClientResponseSerializer()
    period = serializers.CharField()
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    kpis = KpiSerializer()
    chart = ChartEntrySerializer(many=True)
    bills = BillResponseSerializer(many=True)
    payments = ClientPaymentResponseSerializer(many=True)
