'''
Factories de datos de prueba para los tests del backend.

Cada factory crea el objeto en la base con valores por defecto válidos y, si no se le pasan,
también sus dependencias (por ejemplo, make_client crea su localidad y su condición de IVA).
El test solo indica los campos que le importan:

    client = make_client(cuenta_corriente=Decimal('5000.00'))
    supplier = make_supplier(nombre='Pepe', mercado=market)

Si se agrega, quita o renombra un campo de un modelo, se ajusta acá y no en cada test.

Uso: preparar los datos que el test necesita. Los tests que prueban el alta o las validaciones
de un modelo arman sus datos a mano, para que se vea qué campos están probando.
'''
import datetime
import itertools
from decimal import Decimal

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
from novedad.models import Novedad, NovedadUsuario
from pago_cliente.models import PagoCliente
from pago_compra.models import PagoCompra
from producto.models import Producto
from proveedor.models import Proveedor
from provincia.models import Provincia
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_contenedor.models import TipoContenedor
from tipo_factura.models import TipoFactura
from tipo_pago.models import TipoPago
from tipo_unidad.models import TipoUnidad
from tipo_venta.models import TipoVenta
from tutorial.constants import StepAdvance
from tutorial.models import Tutorial, TutorialPaso, TutorialUsuario


_sequence = itertools.count(1)


def _next():
    '''
    Número único dentro de la corrida, para armar valores de campos únicos.
    '''
    return next(_sequence)


DEFAULT_DATE = datetime.date(2026, 1, 15)


# --- Ubicación ---

def make_province(**overrides):
    n = _next()
    # Dos letras: no choca con los ids numéricos que usan los tests.
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    data = {
        'id': letters[(n // 26) % 26] + letters[n % 26],
        'nombre': f'Provincia {n}',
    }
    data.update(overrides)
    return Provincia.objects.create(**data)


def make_municipality(**overrides):
    n = _next()
    data = {'id': f'M{n:05d}', 'nombre': f'Municipio {n}'}
    data.update(overrides)
    if 'provincia' not in data:
        data['provincia'] = make_province()
    return Municipio.objects.create(**data)


def make_locality(**overrides):
    n = _next()
    data = {'id': f'{900000000 + n}', 'nombre': f'Localidad {n}'}
    data.update(overrides)
    if 'municipio' not in data:
        data['municipio'] = make_municipality()
    return Localidad.objects.create(**data)


# --- Tablas de tipos ---

def make_vat_condition(**overrides):
    data = {'descripcion': f'Cond IVA {_next()}'}
    data.update(overrides)
    return TipoCondicionIva.objects.create(**data)


def make_market(**overrides):
    data = {'descripcion': f'Mercado {_next()}'}
    data.update(overrides)
    return Mercado.objects.create(**data)


def make_bank(**overrides):
    data = {'descripcion': f'Banco {_next()}'}
    data.update(overrides)
    return Banco.objects.create(**data)


def make_check_state(**overrides):
    data = {'descripcion': f'ESTADO_{_next()}'}
    data.update(overrides)
    return EstadoCheque.objects.create(**data)


def make_payment_type(**overrides):
    data = {'descripcion': f'Pago {_next()}'}
    data.update(overrides)
    return TipoPago.objects.create(**data)


def make_category(**overrides):
    data = {'descripcion': f'Categoria {_next()}'}
    data.update(overrides)
    return Categoria.objects.create(**data)


def make_container_type(**overrides):
    data = {'descripcion': f'Cont {_next()}'}
    data.update(overrides)
    return TipoContenedor.objects.create(**data)


def make_unit_type(**overrides):
    data = {'descripcion': f'Unidad {_next()}', 'tipo_medicion': 'CANTIDAD'}
    data.update(overrides)
    return TipoUnidad.objects.create(**data)


def make_sale_type(**overrides):
    data = {'descripcion': f'Venta {_next()}'}
    data.update(overrides)
    return TipoVenta.objects.create(**data)


def make_bill_type(**overrides):
    n = _next()
    data = {'descripcion': f'Factura {n}', 'abreviatura': f'{n % 1000:03d}'}
    data.update(overrides)
    return TipoFactura.objects.create(**data)


# --- Clientes y proveedores ---

def make_price_list(**overrides):
    n = _next()
    data = {'nombre': f'Lista {n}', 'descripcion': f'Lista de precios {n}'}
    data.update(overrides)
    return ListaPrecios.objects.create(**data)


def make_client(**overrides):
    n = _next()
    data = {
        'cuit': f'{20000000000 + n}',
        'razon_social': f'Cliente {n}',
        'cuenta_corriente': Decimal('0.00'),
    }
    data.update(overrides)
    if 'localidad' not in data:
        data['localidad'] = make_locality()
    if 'condicion_IVA' not in data:
        data['condicion_IVA'] = make_vat_condition()
    return Cliente.objects.create(**data)


def make_supplier(**overrides):
    n = _next()
    data = {
        'nombre': f'Proveedor {n}',
        'puesto': n % 1000,
        'nombre_fantasia': f'Fantasia {n}',
        'cuenta_corriente': Decimal('0.00'),
    }
    data.update(overrides)
    if 'mercado' not in data:
        data['mercado'] = make_market()
    return Proveedor.objects.create(**data)


def make_contact(**overrides):
    '''
    Contacto de un cliente o de un proveedor. Si no se indica ninguno de los dos, crea un cliente.
    '''
    data = {'numero': f'11{_next():08d}'}
    data.update(overrides)
    if data.get('cliente') is None and data.get('proveedor') is None:
        data['cliente'] = make_client()
    return Contacto.objects.create(**data)


# --- Productos y precios ---

def make_product(**overrides):
    data = {'descripcion': f'Producto {_next()}'}
    data.update(overrides)
    if 'categoria' not in data:
        data['categoria'] = make_category()
    if 'tipo_contenedor' not in data:
        data['tipo_contenedor'] = make_container_type()
    if 'tipo_unidad' not in data:
        data['tipo_unidad'] = make_unit_type()
    return Producto.objects.create(**data)


def make_product_price(**overrides):
    data = {'precio': Decimal('1000')}
    data.update(overrides)
    if 'lista_precios' not in data:
        data['lista_precios'] = make_price_list()
    if 'producto' not in data:
        data['producto'] = make_product()
    if 'tipo_venta' not in data:
        data['tipo_venta'] = make_sale_type()
    return ListaPreciosProducto.objects.create(**data)


# --- Facturación y pagos de clientes ---

def make_bill(**overrides):
    data = {
        'fecha': DEFAULT_DATE,
        'subtotal': Decimal('1000.00'),
        'total': Decimal('1000.00'),
    }
    data.update(overrides)
    if 'cliente' not in data:
        data['cliente'] = make_client()
    if 'tipo_factura' not in data:
        data['tipo_factura'] = make_bill_type()
    return Factura.objects.create(**data)


def make_client_payment(**overrides):
    data = {'fecha_pago': DEFAULT_DATE, 'importe': Decimal('1000.00')}
    data.update(overrides)
    if 'cliente' not in data:
        data['cliente'] = make_client()
    if 'tipo_pago' not in data:
        data['tipo_pago'] = make_payment_type()
    return PagoCliente.objects.create(**data)


# --- Compras y pagos a proveedores ---

def make_purchase(**overrides):
    data = {
        'fecha': DEFAULT_DATE,
        'importe': Decimal('1000.00'),
        'senia': Decimal('0.00'),
    }
    data.update(overrides)
    if 'proveedor' not in data:
        data['proveedor'] = make_supplier()
    return Compra.objects.create(**data)


def make_purchase_payment(**overrides):
    data = {'fecha_pago': DEFAULT_DATE, 'importe_abonado': Decimal('1000.00')}
    data.update(overrides)
    if 'compra' not in data:
        data['compra'] = make_purchase(proveedor=data['proveedor']) if 'proveedor' in data else make_purchase()
    if 'proveedor' not in data:
        data['proveedor'] = data['compra'].proveedor
    if 'tipo_pago' not in data:
        data['tipo_pago'] = make_payment_type()
    return PagoCompra.objects.create(**data)


def make_empty_movement(**overrides):
    data = {
        'fecha': DEFAULT_DATE,
        'tipo': EmptyMovementType.LOAD,
        'importe': Decimal('1000.00'),
    }
    data.update(overrides)
    if 'proveedor' not in data:
        data['proveedor'] = make_supplier()
    return MovimientoVacio.objects.create(**data)


# --- Cheques ---

def make_check(**overrides):
    data = {
        'numero': _next(),
        'importe': Decimal('1000.00'),
        'fecha_emision': DEFAULT_DATE,
    }
    data.update(overrides)
    if 'banco' not in data:
        data['banco'] = make_bank()
    if 'estado' not in data:
        data['estado'] = make_check_state()
    return Cheque.objects.create(**data)


def make_own_check(**overrides):
    data = {
        'numero': _next(),
        'importe': Decimal('1000.00'),
        'fecha_emision': DEFAULT_DATE,
        'fecha_vencimiento': DEFAULT_DATE + datetime.timedelta(days=30),
    }
    data.update(overrides)
    if 'banco' not in data:
        data['banco'] = make_bank()
    return OwnCheck.objects.create(**data)


# --- Usuarios, novedades y tutoriales ---

def make_user(**overrides):
    n = _next()
    data = {'username': f'user{n}', 'password': 'x', 'role': Usuario.EMPLOYEE}
    data.update(overrides)
    data.setdefault('email', f'{data["username"]}@test.com')
    return Usuario.objects.create_user(**data)


def make_news(**overrides):
    n = _next()
    data = {
        'titulo': f'Novedad {n}',
        'descripcion': f'Descripción de la novedad {n}',
        'fecha_publicacion': datetime.date.today(),
    }
    data.update(overrides)
    return Novedad.objects.create(**data)


def make_news_view(**overrides):
    data = dict(overrides)
    if 'novedad' not in data:
        data['novedad'] = make_news()
    if 'usuario' not in data:
        data['usuario'] = make_user()
    return NovedadUsuario.objects.create(**data)


def make_tutorial(**overrides):
    n = _next()
    data = {
        'clave': f'tutorial-{n}',
        'titulo': f'Tutorial {n}',
        'descripcion': f'Descripción del tutorial {n}',
        'seccion': 'General',
    }
    data.update(overrides)
    return Tutorial.objects.create(**data)


def make_tutorial_step(**overrides):
    n = _next()
    data = {
        'orden': n,
        'ruta': '/',
        'elemento': f'elemento-{n}',
        'titulo': f'Paso {n}',
        'descripcion': f'Descripción del paso {n}',
        'avance': StepAdvance.choices[0][0],
    }
    data.update(overrides)
    if 'tutorial' not in data:
        data['tutorial'] = make_tutorial()
    return TutorialPaso.objects.create(**data)


def make_tutorial_progress(**overrides):
    data = dict(overrides)
    if 'tutorial' not in data:
        data['tutorial'] = make_tutorial()
    if 'usuario' not in data:
        data['usuario'] = make_user()
    return TutorialUsuario.objects.create(**data)
