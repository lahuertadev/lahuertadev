from django.db import transaction
from .models import Factura
from .interfaces import IBillRepository
from factura_producto.models import FacturaProducto


class BillRepository(IBillRepository):

    def get_all_bills(self, cliente_id=None):
        qs = Factura.objects.select_related('cliente', 'tipo_factura').all()
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs

    def get_bill_by_id(self, id):
        return (
            Factura.objects
            .select_related('cliente', 'tipo_factura')
            .filter(id=id)
            .first()
        )

    @transaction.atomic
    def create_bill(self, data):
        items = data.pop('items')

        importe = sum(
            item['precio_unitario'] * item['cantidad_producto']
            for item in items
        )

        factura = Factura(
            cliente=data['cliente'],
            tipo_factura=data['tipo_factura'],
            fecha=data['fecha'],
            importe=importe,
        )
        factura.save()

        for item in items:
            FacturaProducto.objects.create(
                factura=factura,
                producto=item['producto'],
                cantidad_producto=item['cantidad_producto'],
                precio_unitario=item['precio_unitario'],
                precio_bulto=item.get('precio_bulto'),
            )

        cliente = data['cliente']
        cliente.cuenta_corriente += importe
        cliente.save(update_fields=['cuenta_corriente'])

        return factura

    @transaction.atomic
    def update_bill(self, id, data):
        factura = self.get_bill_by_id(id)
        if not factura:
            raise ValueError(f'No se encontró la factura con id {id}.')

        importe_anterior = factura.importe
        items = data.pop('items', None)

        if 'fecha' in data:
            factura.fecha = data['fecha']
        if 'tipo_factura' in data:
            factura.tipo_factura = data['tipo_factura']

        if items is not None:
            nuevo_importe = sum(
                item['precio_unitario'] * item['cantidad_producto']
                for item in items
            )
            factura.importe = nuevo_importe

            FacturaProducto.objects.filter(factura=factura).delete()
            for item in items:
                FacturaProducto.objects.create(
                    factura=factura,
                    producto=item['producto'],
                    cantidad_producto=item['cantidad_producto'],
                    precio_unitario=item['precio_unitario'],
                    precio_bulto=item.get('precio_bulto'),
                )

            diferencia = nuevo_importe - importe_anterior
            cliente = factura.cliente
            cliente.cuenta_corriente += diferencia
            cliente.save(update_fields=['cuenta_corriente'])

        factura.save()
        return factura
