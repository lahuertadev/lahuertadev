'''
Constructores de mocks de los modelos, para los tests de service y de views que no usan la base.

Son el equivalente de las factories (core/tests/factories.py): cada constructor arma el mock con
valores por defecto válidos y, si no se le pasan, también sus relaciones. Los parámetros son los
campos del modelo. El test solo indica los que le importan:

    supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
    payment = mock_purchase_payment(proveedor=supplier, importe_abonado=Decimal('2000.00'))

Si se agrega, quita o renombra un campo de un modelo, se ajusta acá y no en cada test.

Asignar o leer un atributo que el modelo no tiene lanza AttributeError, tanto al armar el mock como
cuando el service lo usa. Las anotaciones de las consultas (no son campos) se declaran en
annotations, y solo existen en el mock si se pasan.

Para verificar un resultado, el test guarda la entidad que le importa y pregunta sobre ella
(assert supplier.cuenta_corriente == ...), sin recorrer las relaciones del mock.

Los repositorios y servicios que se inyectan, y los objetos que el test solo pasa de un lado a otro
sin leerles ningún atributo, siguen siendo un Mock() común.
'''
import datetime
import itertools
from decimal import Decimal
from unittest.mock import Mock

from autenticacion.models import Usuario
from banco.models import Banco
from categoria.models import Categoria
from cheque.models import Cheque
from cheque_propio.models import OwnCheck
from cliente.models import Cliente
from compra.models import Compra
from contacto.models import Contacto
from estado_cheque.models import EstadoCheque
from factura.models import Factura
from lista_precios.models import ListaPrecios
from lista_precios_producto.models import ListaPreciosProducto
from localidad.models import Localidad
from mercado.models import Mercado
from movimiento_vacio.constants import EmptyMovementType
from movimiento_vacio.models import MovimientoVacio
from municipio.models import Municipio
from pago_cliente.models import PagoCliente
from pago_compra.models import PagoCompra, PagoCompraChequePropio
from producto.models import Producto
from proveedor.models import Proveedor
from provincia.models import Provincia
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_contenedor.models import TipoContenedor
from tipo_factura.models import TipoFactura
from tipo_pago.models import TipoPago
from tipo_unidad.models import TipoUnidad
from tipo_venta.models import TipoVenta
from tutorial.constants import TutorialStatus
from tutorial.models import Tutorial, TutorialUsuario


_sequence = itertools.count(1)

DEFAULT_DATE = datetime.date(2026, 1, 15)


def _next():
    '''
    Número único dentro de la corrida, para los ids y los valores de los campos.
    '''
    return next(_sequence)


def _build(model, data, overrides, annotations=()):
    '''
    Arma el mock del modelo con los datos por defecto y los overrides del test. Completa el id de
    cada relación con el de la entidad relacionada (proveedor_id con proveedor.id).
    '''
    values = {**data, **overrides}
    for field in model._meta.concrete_fields:
        if field.is_relation and field.name in values and field.attname not in values:
            related = values[field.name]
            values[field.attname] = None if related is None else related.id

    # pk y _meta: los serializers de DRF los leen para tratar al mock como una instancia del modelo.
    if 'id' in values:
        values.setdefault('pk', values['id'])
    values.setdefault('_meta', model._meta)

    allowed = [*dir(model), *(name for name in annotations if name in values)]
    mocked = Mock(spec_set=allowed)
    for name, value in values.items():
        setattr(mocked, name, value)
    return mocked


def _related(overrides, field, builder, **kwargs):
    '''
    La relación que indicó el test (puede ser None) o, si no indicó ninguna, una nueva.
    '''
    return overrides[field] if field in overrides else builder(**kwargs)


# --- Tablas de tipos ---

def mock_vat_condition(**overrides):
    n = _next()
    data = {'id': n, 'descripcion': f'Cond IVA {n}', 'codigo_afip': 1, 'is_system': False}
    return _build(TipoCondicionIva, data, overrides)


def mock_market(**overrides):
    n = _next()
    return _build(Mercado, {'id': n, 'descripcion': f'Mercado {n}'}, overrides)


def mock_bank(**overrides):
    n = _next()
    return _build(Banco, {'id': n, 'descripcion': f'Banco {n}'}, overrides)


def mock_check_state(**overrides):
    n = _next()
    return _build(EstadoCheque, {'id': n, 'descripcion': f'ESTADO_{n}'}, overrides)


def mock_payment_type(**overrides):
    n = _next()
    return _build(TipoPago, {'id': n, 'descripcion': f'Pago {n}'}, overrides)


def mock_category(**overrides):
    n = _next()
    return _build(Categoria, {'id': n, 'descripcion': f'Categoria {n}', 'is_system': False}, overrides)


def mock_container_type(**overrides):
    n = _next()
    data = {'id': n, 'descripcion': f'Cont {n}', 'abreviacion': 'c', 'requiere_vacio': True, 'is_system': False}
    return _build(TipoContenedor, data, overrides)


def mock_unit_type(**overrides):
    n = _next()
    data = {'id': n, 'descripcion': f'Unidad {n}', 'abreviacion': 'u', 'tipo_medicion': 'CANTIDAD', 'is_system': False}
    return _build(TipoUnidad, data, overrides)


def mock_sale_type(**overrides):
    n = _next()
    return _build(TipoVenta, {'id': n, 'descripcion': f'Venta {n}'}, overrides)


def mock_bill_type(**overrides):
    n = _next()
    data = {'id': n, 'descripcion': f'Factura {n}', 'abreviatura': f'{n % 1000:03d}', 'codigo_afip': None}
    return _build(TipoFactura, data, overrides)


# --- Clientes y proveedores ---

def mock_province(**overrides):
    n = _next()
    return _build(Provincia, {'id': f'P{n}', 'nombre': f'Provincia {n}'}, overrides)


def mock_municipality(**overrides):
    n = _next()
    data = {
        'id': f'M{n:05d}',
        'nombre': f'Municipio {n}',
        'provincia': _related(overrides, 'provincia', mock_province),
    }
    return _build(Municipio, data, overrides)


def mock_locality(**overrides):
    n = _next()
    data = {
        'id': f'{900000000 + n}',
        'nombre': f'Localidad {n}',
        'municipio': _related(overrides, 'municipio', mock_municipality),
    }
    return _build(Localidad, data, overrides)


def mock_price_list(**overrides):
    n = _next()
    return _build(ListaPrecios, {'id': n, 'nombre': f'Lista {n}', 'descripcion': f'Lista de precios {n}'}, overrides)


def mock_client(**overrides):
    n = _next()
    data = {
        'id': n,
        'cuit': f'{20000000000 + n}',
        'razon_social': f'Cliente {n}',
        'cuenta_corriente': Decimal('0.00'),
        'localidad': _related(overrides, 'localidad', mock_locality),
        'condicion_IVA': _related(overrides, 'condicion_IVA', mock_vat_condition),
        'lista_precios': _related(overrides, 'lista_precios', mock_price_list),
    }
    return _build(Cliente, data, overrides)


def mock_supplier(**overrides):
    n = _next()
    data = {
        'id': n,
        'nombre': f'Proveedor {n}',
        'puesto': n % 1000,
        'nave': None,
        'nombre_fantasia': f'Fantasia {n}',
        'cuenta_corriente': Decimal('0.00'),
        'mercado': _related(overrides, 'mercado', mock_market),
    }
    return _build(Proveedor, data, overrides)


def mock_contact(**overrides):
    '''
    Contacto de un cliente o de un proveedor. Si no se indica ninguno de los dos, arma un cliente.
    '''
    n = _next()
    has_owner = overrides.get('cliente') is not None or overrides.get('proveedor') is not None
    data = {
        'id': n,
        'numero': f'11{n:08d}',
        'descripcion': None,
        'email': None,
        'cliente': None if has_owner else mock_client(),
        'proveedor': None,
    }
    return _build(Contacto, data, overrides)


# --- Productos y precios ---

def mock_product(**overrides):
    n = _next()
    data = {
        'id': n,
        'descripcion': f'Producto {n}',
        'categoria': _related(overrides, 'categoria', mock_category),
        'tipo_contenedor': _related(overrides, 'tipo_contenedor', mock_container_type),
        'tipo_unidad': _related(overrides, 'tipo_unidad', mock_unit_type),
        'cantidad_por_bulto': None,
        'peso_aproximado': None,
    }
    return _build(Producto, data, overrides)


def mock_product_price(**overrides):
    data = {
        'id': _next(),
        'precio': Decimal('1000'),
        'lista_precios': _related(overrides, 'lista_precios', mock_price_list),
        'producto': _related(overrides, 'producto', mock_product),
        'tipo_venta': _related(overrides, 'tipo_venta', mock_sale_type),
    }
    return _build(ListaPreciosProducto, data, overrides)


# --- Facturación y pagos de clientes ---

def mock_bill(**overrides):
    data = {
        'id': _next(),
        'fecha': DEFAULT_DATE,
        'subtotal': Decimal('1000.00'),
        'total': Decimal('1000.00'),
        'numero_comprobante': None,
        'cae': None,
        'cae_vto': None,
        'factura_asociada': None,
        'cliente': _related(overrides, 'cliente', mock_client),
        'tipo_factura': _related(overrides, 'tipo_factura', mock_bill_type),
    }
    return _build(Factura, data, overrides)


def mock_client_payment(**overrides):
    data = {
        'id': _next(),
        'fecha_pago': DEFAULT_DATE,
        'importe': Decimal('1000.00'),
        'observaciones': None,
        'cliente': _related(overrides, 'cliente', mock_client),
        'tipo_pago': _related(overrides, 'tipo_pago', mock_payment_type),
    }
    return _build(PagoCliente, data, overrides)


# --- Compras y pagos a proveedores ---

def mock_purchase(**overrides):
    '''
    Compra. total_payments es la anotación de la consulta: solo existe si se pasa.
    '''
    data = {
        'id': _next(),
        'fecha': DEFAULT_DATE,
        'importe': Decimal('1000.00'),
        'senia': Decimal('0.00'),
        'proveedor': _related(overrides, 'proveedor', mock_supplier),
    }
    return _build(Compra, data, overrides, annotations=('total_payments',))


def mock_purchase_payment(**overrides):
    '''
    Pago a proveedor. Con compra=None es un pago a cuenta. Con cheque_propio=<mock>, el pago se hace
    con ese cheque emitido por todo su importe (payment.own_check_uses.all()).
    '''
    own_check = overrides.pop('cheque_propio', None)
    if 'compra' in overrides:
        buy = overrides['compra']
    elif 'proveedor' in overrides:
        buy = mock_purchase(proveedor=overrides['proveedor'])
    else:
        buy = mock_purchase()
    data = {
        'id': _next(),
        'fecha_pago': DEFAULT_DATE,
        'importe_abonado': Decimal('1000.00'),
        'estado_pago': None,
        'compra': buy,
        'proveedor': overrides['proveedor'] if 'proveedor' in overrides else buy.proveedor,
        'tipo_pago': _related(overrides, 'tipo_pago', mock_payment_type),
    }
    payment = _build(PagoCompra, data, overrides)
    if own_check:
        use = mock_own_check_use(pago_compra=payment, cheque_propio=own_check, importe=payment.importe_abonado)
        payment.own_check_uses.all.return_value = [use]
    return payment


def mock_own_check_use(**overrides):
    '''
    Uso de un cheque emitido en un pago (cuánto del cheque se aplica a ese pago).
    '''
    data = {
        'id': _next(),
        'importe': Decimal('1000.00'),
        'cheque_propio': _related(overrides, 'cheque_propio', mock_own_check),
        'pago_compra': _related(overrides, 'pago_compra', mock_purchase_payment),
    }
    return _build(PagoCompraChequePropio, data, overrides)


def mock_empty_movement(**overrides):
    data = {
        'id': _next(),
        'fecha': DEFAULT_DATE,
        'tipo': EmptyMovementType.LOAD,
        'nro_comprobante': None,
        'importe': Decimal('1000.00'),
        'proveedor': _related(overrides, 'proveedor', mock_supplier),
    }
    return _build(MovimientoVacio, data, overrides)


# --- Cheques ---

def mock_check(**overrides):
    n = _next()
    data = {
        'id': n,
        'numero': n,
        'importe': Decimal('1000.00'),
        'fecha_emision': DEFAULT_DATE,
        'fecha_deposito': None,
        'fecha_endoso': None,
        'endosado': False,
        'pago_cliente': None,
        'pago_compra': None,
        'banco': _related(overrides, 'banco', mock_bank),
        'estado': _related(overrides, 'estado', mock_check_state),
    }
    return _build(Cheque, data, overrides)


def mock_own_check(**overrides):
    n = _next()
    data = {
        'id': n,
        'numero': n,
        'importe': Decimal('1000.00'),
        'fecha_emision': DEFAULT_DATE,
        'fecha_deposito': None,
        'fecha_vencimiento': DEFAULT_DATE + datetime.timedelta(days=30),
        'estado': OwnCheck.State.EMITIDO,
        'observaciones': None,
        'banco': _related(overrides, 'banco', mock_bank),
    }
    return _build(OwnCheck, data, overrides)


# --- Usuarios y tutoriales ---

def mock_user(**overrides):
    n = _next()
    data = {
        'id': n,
        'username': f'user{n}',
        'password': 'x',
        'email': f'user{n}@test.com',
        'role': Usuario.EMPLOYEE,
    }
    return _build(Usuario, data, overrides)


def mock_tutorial(**overrides):
    n = _next()
    data = {
        'id': n,
        'clave': f'tutorial-{n}',
        'titulo': f'Tutorial {n}',
        'descripcion': f'Descripción del tutorial {n}',
        'seccion': 'General',
    }
    return _build(Tutorial, data, overrides)


def mock_tutorial_progress(**overrides):
    data = {
        'id': _next(),
        'estado': TutorialStatus.STARTED,
        'tutorial': _related(overrides, 'tutorial', mock_tutorial),
        'usuario': _related(overrides, 'usuario', mock_user),
    }
    return _build(TutorialUsuario, data, overrides)
