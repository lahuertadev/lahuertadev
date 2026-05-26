import sys
from unittest.mock import MagicMock

# pyafipws no está instalado en el entorno de test; se mockea a nivel de módulo
# para evitar ImportError al importar arca.service y sus dependientes.
for mod in ["pyafipws", "pyafipws.wsaa", "pyafipws.wsfev1"]:
    sys.modules.setdefault(mod, MagicMock())
