from django.core.management.base import BaseCommand
from django.db import transaction
from factura.models import Factura
from tipo_factura.models import TipoFactura


class Command(BaseCommand):
    help = "Asigna numero_comprobante secuencial a facturas que no lo tienen, agrupado por tipo"

    def handle(self, *args, **kwargs):
        tipos = TipoFactura.objects.filter(
            factura__numero_comprobante__isnull=True
        ).distinct()

        if not tipos.exists():
            self.stdout.write(self.style.SUCCESS("No hay facturas sin numero_comprobante. Nada que hacer."))
            return

        with transaction.atomic():
            for tipo in tipos:
                facturas = Factura.objects.filter(
                    tipo_factura=tipo,
                    numero_comprobante__isnull=True,
                ).order_by('id')

                count = facturas.count()
                if count == 0:
                    continue

                last = Factura.objects.filter(
                    tipo_factura=tipo,
                    numero_comprobante__isnull=False,
                ).aggregate(max=__import__('django.db.models', fromlist=['Max']).Max('numero_comprobante'))['max'] or 0

                for i, factura in enumerate(facturas, start=last + 1):
                    factura.numero_comprobante = i
                    factura.save(update_fields=['numero_comprobante'])

                self.stdout.write(
                    self.style.SUCCESS(f"  {tipo.abreviatura}: {count} registros numerados ({last + 1} → {last + count})")
                )

        self.stdout.write(self.style.SUCCESS("Backfill completado."))
