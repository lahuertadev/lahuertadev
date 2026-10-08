import sys
import pytest
from unittest.mock import MagicMock, patch

# pyafipws no está instalado en el entorno de test; se mockea a nivel de módulo
# para evitar ImportError al importar arca.service y sus dependientes.
for mod in ["pyafipws", "pyafipws.wsaa", "pyafipws.wsfev1"]:
    sys.modules.setdefault(mod, MagicMock())


@pytest.fixture(autouse=True)
def mock_atomic(request):
    """
    Parchea Atomic.__enter__/__exit__ para que transaction.atomic sea un no-op.
    Los tests de servicio usan repos mockeados y no necesitan DB real; esto
    evita el intento de conexión a MySQL del entorno Docker.

    No se aplica a los tests que usan la DB (marca django_db o fixture db):
    pytest-django envuelve cada uno en un atomic real y hace rollback al terminar,
    para que la base quede limpia para el siguiente test.
    """
    uses_db = request.node.get_closest_marker('django_db') or 'db' in request.fixturenames
    if uses_db:
        yield
        return

    from django.db import transaction
    with patch.object(transaction.Atomic, '__enter__', return_value=None), \
         patch.object(transaction.Atomic, '__exit__', return_value=False):
        yield
