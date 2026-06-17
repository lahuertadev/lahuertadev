import sys
import pytest
from unittest.mock import MagicMock, patch

# pyafipws no está instalado en el entorno de test; se mockea a nivel de módulo
# para evitar ImportError al importar arca.service y sus dependientes.
for mod in ["pyafipws", "pyafipws.wsaa", "pyafipws.wsfev1"]:
    sys.modules.setdefault(mod, MagicMock())


@pytest.fixture(autouse=True)
def mock_atomic():
    """
    Parchea Atomic.__enter__/__exit__ para que transaction.atomic sea un no-op.
    Los tests de servicio usan repos mockeados y no necesitan DB real; esto
    evita el intento de conexión a MySQL del entorno Docker.
    """
    from django.db import transaction
    with patch.object(transaction.Atomic, '__enter__', return_value=None), \
         patch.object(transaction.Atomic, '__exit__', return_value=False):
        yield
