from datetime import date
from django.core.management.base import BaseCommand
from arca.service import ARCAService
from arca.exceptions import WSAAAuthenticationError, WSFEEmissionError, WSFEInvalidReceiptTypeError


class Command(BaseCommand):
    help = "Prueba la autenticación y emisión de un comprobante de prueba en homologación ARCA"

    def handle(self, *args, **kwargs):
        self.stdout.write("Probando autenticación y emisión contra homologación ARCA...")

        service = ARCAService(homologacion=True)

        try:
            service._authenticate()
            self.stdout.write(self.style.SUCCESS(f"  OK — token obtenido"))
        except WSAAAuthenticationError as e:
            self.stdout.write(self.style.ERROR(f"  ERROR en WSAA: {e}"))
            return

        self.stdout.write("  [2/2] Emitiendo comprobante de prueba (Factura B)...")
        try:
            result = service.emit_receipt(
                tipo_factura_abreviatura="FB",
                importe=1210.00,
                fecha=date.today(),
                cuit_receptor="20000000001",
                condicion_iva_receptor_id=5,  # AFIP code 5 = Consumidor Final
            )
            self.stdout.write(self.style.SUCCESS(
                f"\n  Comprobante emitido exitosamente:\n"
                f"    Número:  {result['numero_comprobante']}\n"
                f"    CAE:     {result['cae']}\n"
                f"    Vto CAE: {result['cae_vto']}\n"
            ))
        except WSFEInvalidReceiptTypeError as e:
            self.stdout.write(self.style.ERROR(f"  ERROR tipo comprobante: {e}"))
        except WSFEEmissionError as e:
            self.stdout.write(self.style.ERROR(f"  ERROR en WSFE: {e}"))
