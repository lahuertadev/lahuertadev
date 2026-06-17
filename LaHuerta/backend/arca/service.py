from datetime import datetime, date, timezone
from pathlib import Path
import json
from django.conf import settings
try:
    from pyafipws.wsaa import WSAA
    from pyafipws.wsfev1 import WSFEv1
except ImportError:
    WSAA = None
    WSFEv1 = None
from .exceptions import WSAAAuthenticationError, WSFEEmissionError

CERTS_DIR = Path(settings.BASE_DIR) / "certs"
CERT_PATH_PROD = str(CERTS_DIR / "lahuerta.crt")
CERT_PATH_HOMO = str(CERTS_DIR / "lahuerta_homo.crt")
KEY_PATH_PROD = str(CERTS_DIR / "lahuerta.key")
KEY_PATH_HOMO = str(CERTS_DIR / "lahuerta_homo.key")
TOKEN_CACHE_PROD = str(CERTS_DIR / "token_prod.json")
TOKEN_CACHE_HOMO = str(CERTS_DIR / "token_homo.json")

WSAA_WSDL_HOMO = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl"
WSFE_WSDL_HOMO = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"

WSAA_WSDL_PROD = "https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl"
WSFE_WSDL_PROD = "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"

CUIT_EMISOR = "20331162907"
PUNTO_VENTA = 3


class ARCAService:

    def __init__(self, homologacion: bool = True):
        self.homologacion = homologacion
        self.wsaa_wsdl = WSAA_WSDL_HOMO if homologacion else WSAA_WSDL_PROD
        self.wsfe_wsdl = WSFE_WSDL_HOMO if homologacion else WSFE_WSDL_PROD
        self.cert_path = CERT_PATH_HOMO if homologacion else CERT_PATH_PROD
        self.key_path = KEY_PATH_HOMO if homologacion else KEY_PATH_PROD
        self.token_cache_path = TOKEN_CACHE_HOMO if homologacion else TOKEN_CACHE_PROD
        self._token = None
        self._sign = None

    def _load_cached_token(self) -> bool:
        cache = Path(self.token_cache_path)
        if not cache.exists():
            return False
        try:
            data = json.loads(cache.read_text())
            expiry = datetime.fromisoformat(data["expiry"])
            if expiry > datetime.now(timezone.utc):
                self._token = data["token"]
                self._sign = data["sign"]
                return True
        except Exception:
            pass
        return False

    def _save_token_cache(self, expiry_str: str) -> None:
        try:
            expiry = datetime.strptime(expiry_str, "%Y-%m-%dT%H:%M:%S.%f%z")
            Path(self.token_cache_path).write_text(json.dumps({
                "token": self._token,
                "sign": self._sign,
                "expiry": expiry.isoformat(),
            }))
        except Exception:
            pass

    def _authenticate(self) -> None:
        if self._load_cached_token():
            return
        if WSAA is None:
            raise WSAAAuthenticationError(
                "La librería pyafipws no está instalada. "
                "No es posible autenticarse en WSAA en este entorno."
            )
        wsaa = WSAA()
        try:
            tra = wsaa.CreateTRA(service="wsfe")
            cms = wsaa.SignTRA(tra, self.cert_path, self.key_path)
            ta_xml = wsaa.CallWSAA(cms, self.wsaa_wsdl)
            wsaa.AnalizarXml(ta_xml)
            self._token = wsaa.ObtenerTagXml("token")
            self._sign = wsaa.ObtenerTagXml("sign")
            expiry_str = wsaa.ObtenerTagXml("expirationTime")
            self._save_token_cache(expiry_str)
        except Exception as e:
            if "alreadyAuthenticated" in str(e):
                raise WSAAAuthenticationError(
                    "Ya existe un token válido en AFIP para este certificado. "
                    "Esperá unos minutos y volvé a intentar, o eliminá el caché si el problema persiste."
                ) from e
            raise WSAAAuthenticationError(f"Error al autenticarse en WSAA: {e}") from e

    def _get_wsfe(self):
        if WSFEv1 is None:
            raise WSFEEmissionError(
                "La librería pyafipws no está instalada. "
                "No es posible emitir comprobantes electrónicos en este entorno."
            )
        if not self._token:
            self._authenticate()
        wsfe = WSFEv1()
        wsfe.Conectar("", self.wsfe_wsdl)
        wsfe.Cuit = CUIT_EMISOR
        wsfe.Token = self._token
        wsfe.Sign = self._sign
        return wsfe

    def emit_receipt(self, tipo_cbte: int, importe_total: float, importe_neto: float, iva_breakdown: list, fecha: date, cuit_receptor: str, condicion_iva_receptor_id: int, cbte_asoc: dict = None) -> dict:
        wsfe = self._get_wsfe()

        # Consumidor Final (codigo_afip=5) no requiere identificación fiscal
        if condicion_iva_receptor_id == 5:
            tipo_doc = 99
            nro_doc = 0
        else:
            tipo_doc = 80
            nro_doc = cuit_receptor.replace("-", "")

        try:
            next_receipt_number = int(wsfe.CompUltimoAutorizado(tipo_cbte, PUNTO_VENTA)) + 1
            total_iva = round(importe_total - importe_neto, 2)

            wsfe.CrearFactura(
                concepto=1,
                tipo_doc=tipo_doc,
                nro_doc=nro_doc,
                tipo_cbte=tipo_cbte,
                punto_vta=PUNTO_VENTA,
                cbt_desde=next_receipt_number,
                cbt_hasta=next_receipt_number,
                imp_total=importe_total,
                imp_tot_conc=0,
                imp_neto=importe_neto,
                imp_iva=total_iva,
                imp_trib=0,
                imp_op_ex=0,
                fecha_cbte=fecha.strftime("%Y%m%d"),
                moneda_id="PES",
                moneda_ctz=1,
                condicion_iva_receptor_id=condicion_iva_receptor_id,
            )

            for iva in iva_breakdown:
                wsfe.AgregarIva(iva_id=iva['iva_id'], base_imp=iva['base_imp'], importe=iva['importe'])

            if cbte_asoc:
                wsfe.AgregarCmpAsoc(
                    tipo=cbte_asoc['tipo'],
                    pto_vta=PUNTO_VENTA,
                    nro=cbte_asoc['nro'],
                )

            wsfe.CAESolicitar()

            if wsfe.Resultado != "A":
                raise WSFEEmissionError(f"AFIP rechazó el comprobante: {wsfe.Obs} | Errores: {wsfe.ErrMsg}")

            return {
                "numero_comprobante": next_receipt_number,
                "cae": wsfe.CAE,
                "cae_vto": datetime.strptime(wsfe.Vencimiento, "%Y%m%d").date(),
            }

        except WSFEEmissionError:
            raise
        except Exception as e:
            raise WSFEEmissionError(f"Error al emitir comprobante en WSFE: {e}") from e
