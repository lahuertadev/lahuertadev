import pytest
from decimal import Decimal

from banco.models import Banco
from estado_cheque.models import EstadoCheque
from pago_cliente.models import PagoCliente
from pago_compra.models import PagoCompra
from compra.models import Compra
from proveedor.models import Proveedor
from cliente.models import Cliente
from tipo_pago.models import TipoPago
from mercado.models import Mercado
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_facturacion.models import TipoFacturacion
from tipo_venta.models import TipoVenta
from cheque.models import Cheque
from cheque.repositories import CheckRepository


@pytest.mark.django_db
class TestCheckRepository:
    def setup_method(self):
        self.repository = CheckRepository()
        self.banco = Banco.objects.create(descripcion='Nación')
        self.estado = EstadoCheque.objects.create(descripcion='EN_CARTERA')

    def _make_cheque(self, numero=1001, importe=Decimal('1000.00')):
        return Cheque.objects.create(
            numero=numero,
            importe=importe,
            fecha_emision='2024-01-01',
            banco=self.banco,
            estado=self.estado,
        )

    # ------------------------- GET ALL -------------------------
    def test_get_all_returns_all(self):
        self._make_cheque(1001)
        self._make_cheque(1002)

        result = self.repository.get_all()

        assert result.count() == 2

    def test_get_all_empty(self):
        result = self.repository.get_all()
        assert result.count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_by_id_ok(self):
        cheque = self._make_cheque(1001)

        result = self.repository.get_by_id(1001)

        assert result is not None
        assert result.numero == cheque.numero

    def test_get_by_id_not_found_returns_none(self):
        result = self.repository.get_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_ok(self):
        data = {
            'numero': 2001,
            'importe': Decimal('500.00'),
            'fecha_emision': '2024-06-01',
            'banco': self.banco,
            'estado': self.estado,
        }

        result = self.repository.create(data)

        assert result.numero == 2001
        assert result.importe == Decimal('500.00')
        assert Cheque.objects.count() == 1

    def test_create_con_fecha_deposito(self):
        data = {
            'numero': 2002,
            'importe': Decimal('300.00'),
            'fecha_emision': '2024-06-01',
            'fecha_deposito': '2024-06-15',
            'banco': self.banco,
            'estado': self.estado,
        }

        result = self.repository.create(data)

        assert result.fecha_deposito is not None

    # ------------------------- UPDATE --------------------------
    def test_update_ok(self):
        cheque = self._make_cheque(1001)
        estado_nuevo = EstadoCheque.objects.create(descripcion='DEPOSITADO')

        updated = self.repository.update(cheque, {'estado': estado_nuevo})

        cheque.refresh_from_db()
        assert cheque.estado.descripcion == 'DEPOSITADO'

    def test_update_importe(self):
        cheque = self._make_cheque(1001, importe=Decimal('1000.00'))

        self.repository.update(cheque, {'importe': Decimal('1500.00')})

        cheque.refresh_from_db()
        assert cheque.importe == Decimal('1500.00')

    # ------------------------- DELETE --------------------------
    def test_delete_ok(self):
        cheque = self._make_cheque(1001)

        self.repository.delete(cheque)

        assert Cheque.objects.count() == 0
