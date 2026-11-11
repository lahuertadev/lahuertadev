import importlib

import pytest
from django.apps import apps

from core.tests.factories import make_payment_type
from tipo_pago import constants
from tipo_pago.models import TipoPago

# El nombre del módulo empieza con un número: no se puede importar con `import`.
seed_migration = importlib.import_module('tipo_pago.migrations.0003_seed_tipos_pago')

SYSTEM_DESCRIPTIONS = [
    constants.EFECTIVO,
    constants.TRANSFERENCIA,
    constants.CHEQUE,
    constants.DEBITO,
    constants.CREDITO,
    constants.MERCADO_PAGO,
    constants.CUENTA_CORR,
    constants.PAGARE,
    constants.CHEQUE_PROPIO,
]


def run_seed():
    seed_migration.create_payment_types(apps, None)


def test_migration_descriptions_match_constants():
    # La lógica de pagos compara contra las constantes: si difieren, Cheque / Cheque Propio no se reconocen.
    assert sorted(seed_migration.SYSTEM_PAYMENT_TYPES) == sorted(SYSTEM_DESCRIPTIONS)


@pytest.mark.django_db
class TestSeedPaymentTypesMigration:

    def test_creates_all_system_payment_types_on_empty_table(self):
        run_seed()

        assert TipoPago.objects.count() == len(SYSTEM_DESCRIPTIONS)
        assert set(TipoPago.objects.values_list('descripcion', flat=True)) == set(SYSTEM_DESCRIPTIONS)
        assert not TipoPago.objects.filter(is_system=False).exists()

    def test_running_twice_does_not_duplicate(self):
        run_seed()
        run_seed()

        assert TipoPago.objects.count() == len(SYSTEM_DESCRIPTIONS)

    def test_existing_payment_type_keeps_its_id_and_is_marked_as_system(self):
        existing = make_payment_type(descripcion=constants.CHEQUE, is_system=False)

        run_seed()

        existing.refresh_from_db()
        assert existing.is_system is True
        assert TipoPago.objects.filter(descripcion=constants.CHEQUE).count() == 1
        assert TipoPago.objects.count() == len(SYSTEM_DESCRIPTIONS)

    def test_does_not_touch_other_payment_types(self):
        custom = make_payment_type(descripcion='Canje', is_system=False)

        run_seed()

        custom.refresh_from_db()
        assert custom.is_system is False
        assert TipoPago.objects.count() == len(SYSTEM_DESCRIPTIONS) + 1
