from django.db import migrations

# Tutoriales iniciales (DEV-138): uno por pantalla. Cada paso resalta el elemento que la pantalla
# marca con data-tour="<elemento>"; los eventos son los que emite al guardar (emitTutorialEvent).


def step(ruta, elemento, titulo, descripcion, avance, **extra):
    return {'ruta': ruta, 'elemento': elemento, 'titulo': titulo, 'descripcion': descripcion, 'avance': avance, **extra}


def list_action_steps(ruta, entidad):
    '''Recorrido por las acciones de la fila del listado, al terminar un alta.'''
    return [
        step(ruta, 'grid-detail', 'Ver el detalle', f'Con la lupa de cada fila abrís el detalle completo de {entidad}.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True),
        step(ruta, 'grid-edit', 'Editar', f'Con el lápiz modificás los datos de {entidad}.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
        step(ruta, 'grid-delete', 'Eliminar', f'Con el tacho eliminás {entidad}. Antes de borrar, el sistema te pide confirmación.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
        step(ruta, 'grid-row', 'Ver, editar o eliminar', f'Tocá una fila para abrir el detalle de {entidad}: desde ahí podés editarlo o eliminarlo.',
             'next', dispositivo='mobile', solo_lectura=True),
    ]


TUTORIALS = [
    {
        'clave': 'clients',
        'titulo': 'Clientes',
        'descripcion': 'Cómo dar de alta un cliente y qué podés hacer desde el listado.',
        'seccion': 'Clientes',
        'pasos': [
            step('/client', 'list-add', 'Nuevo cliente', 'Tocá "Nuevo cliente" para abrir el formulario de alta.',
                 'route', ruta_destino='/client/create'),
            step('/client/create', 'client-cuit', 'CUIT', 'Escribí el CUIT del cliente (11 números, los guiones se ponen solos). Después tocá Continuar.',
                 'check', condicion='filled', confirmar=True),
            step('/client/create', 'client-business-name', 'Razón social', 'Escribí la razón social, tal como figura en ARCA. Después tocá Continuar.',
                 'check', condicion='filled', confirmar=True),
            step('/client/create', 'client-province', 'Provincia', 'Elegí la provincia del cliente.',
                 'check', condicion='filled'),
            step('/client/create', 'client-city', 'Municipio', 'Elegí el municipio. La lista se carga según la provincia.',
                 'check', condicion='filled'),
            step('/client/create', 'client-district', 'Localidad', 'Elegí la localidad.',
                 'check', condicion='filled'),
            step('/client/create', 'client-iva-condition', 'Condición de IVA', 'Elegí la condición de IVA: define el tipo de factura que se le hace.',
                 'check', condicion='filled'),
            step('/client/create', 'client-price-list', '¿Lista de precios?',
                 'Sí: al facturarle, el precio se toma de la lista que le asignes. No: el precio de cada producto se carga a mano en la factura. Elegí y tocá Siguiente.',
                 'next'),
            step('/client/create', 'client-price-list-select', 'Lista de precios', 'Elegí la lista de precios del cliente.',
                 'check', condicion='filled', opcional=True),
            step('/client/create', 'client-sales-start', 'Inicio de ventas', 'Elegí la fecha desde la que le vendés.',
                 'check', condicion='date'),
            step('/client/create', 'client-phone', 'Teléfono', 'Escribí el teléfono de contacto: es obligatorio para registrar el cliente. Después tocá Continuar.',
                 'check', condicion='filled', confirmar=True),
            step('/client/create', 'form-confirm', 'Registrar el cliente',
                 'Revisá los datos y tocá "Registrar Cliente". Si el botón no se habilita, falta completar algún campo obligatorio.',
                 'event', evento='client-created'),
            *list_action_steps('/client', 'cada cliente'),
        ],
    },
    {
        'clave': 'bills',
        'titulo': 'Facturación',
        'descripcion': 'Qué hay en Facturas y en Remitos, y cómo hacer una factura.',
        'seccion': 'Clientes',
        'pasos': [
            step('/bill', 'bill-tabs', 'Facturas y remitos',
                 'En Facturas están las facturas y notas de débito y crédito emitidas en ARCA. En Remitos, los remitos de entrega, que no se emiten en ARCA.',
                 'next'),
            step('/bill', 'grid-detail', 'Ver el comprobante',
                 'Con la lupa de cada fila ves el comprobante, listo para imprimir. Una factura ya emitida en ARCA no se puede editar ni eliminar: solo se ve.',
                 'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True),
            step('/bill', 'grid-row', 'Ver el comprobante',
                 'Tocá una fila para ver el comprobante, listo para imprimir. Una factura ya emitida en ARCA no se puede editar ni eliminar: solo se ve.',
                 'next', dispositivo='mobile', solo_lectura=True),
            step('/bill', 'list-add', 'Nueva factura', 'Tocá "Nueva Factura" para empezar. Desde acá también se hacen los remitos.',
                 'route', ruta_destino='/bill/create'),
            step('/bill/create', 'bill-client', 'Cliente', 'Buscá y elegí el cliente por CUIT, razón social o nombre de fantasía.',
                 'check', condicion='complete'),
            step('/bill/create', 'bill-type', 'Tipo de facturación',
                 'Se completa solo según la condición de IVA del cliente. Revisalo, cambialo si hace falta y tocá Continuar.',
                 'check', condicion='complete', confirmar=True),
            step('/bill/create', 'bill-date', 'Fecha', 'Por defecto es la de hoy. Cambiala si la factura es de otro día.',
                 'next'),
            step('/bill/create', 'bill-items', 'Productos',
                 'Elegí el producto, la cantidad y el tipo de venta. Si el cliente tiene lista de precios el precio se completa solo; si no, lo escribís vos. Después tocá Continuar.',
                 'check', condicion='complete', confirmar=True),
            step('/bill/create', 'form-confirm', 'Generar la factura', 'Revisá el total y tocá "Confirmar" para generar la factura.',
                 'event', evento='bill-created'),
        ],
    },
    {
        'clave': 'client-payments',
        'titulo': 'Pagos de Clientes',
        'descripcion': 'Cómo registrar el pago de un cliente y qué podés hacer desde el listado.',
        'seccion': 'Clientes',
        'pasos': [
            step('/client-payment', 'list-add', 'Nuevo pago', 'Tocá "Nuevo pago" para registrar lo que pagó un cliente.',
                 'route', ruta_destino='/client-payment/create'),
            step('/client-payment/create', 'payment-client', 'Cliente', 'Elegí el cliente que pagó.',
                 'check', condicion='filled'),
            step('/client-payment/create', 'payment-amount', 'Importe', 'Escribí el importe que pagó. Después tocá Continuar.',
                 'check', condicion='filled', confirmar=True),
            step('/client-payment/create', 'payment-date', 'Fecha de pago', 'Elegí la fecha en que pagó.',
                 'check', condicion='date'),
            step('/client-payment/create', 'payment-type', 'Tipo de pago', 'Elegí cómo pagó (efectivo, transferencia, cheque…).',
                 'check', condicion='filled'),
            step('/client-payment/create', 'payment-check', 'Datos del cheque',
                 'Como pagó con cheque, cargá el número, el banco y la fecha de emisión. Si es diferido, activalo y poné la fecha de depósito. Después tocá Continuar.',
                 'check', condicion='complete', confirmar=True, opcional=True),
            step('/client-payment/create', 'form-confirm', 'Registrar el pago', 'Tocá "Registrar Pago" para guardarlo.',
                 'event', evento='client-payment-created'),
            *list_action_steps('/client-payment', 'cada pago'),
        ],
    },
    {
        'clave': 'purchases',
        'titulo': 'Compras',
        'descripcion': 'Cómo cargar una compra a un proveedor y qué podés hacer desde el listado.',
        'seccion': 'Proveedores',
        'pasos': [
            step('/buy', 'list-add', 'Nueva compra', 'Tocá "Nueva compra" para empezar.',
                 'route', ruta_destino='/buy/create'),
            step('/buy/create', 'buy-type-bulk', 'Carga masiva',
                 'Sirve para cargar de una vez las compras a varios proveedores en una misma fecha (ej. el día de Mercado Central).',
                 'next', solo_lectura=True),
            step('/buy/create', 'buy-type-simple', 'Carga simple', 'Para una compra a un solo proveedor. Tocá "Carga simple" para seguir.',
                 'route', ruta_destino='/buy/create/simple'),
            step('/buy/create/simple', 'buy-supplier', 'Proveedor', 'Elegí el proveedor al que le compraste.',
                 'check', condicion='complete'),
            step('/buy/create/simple', 'buy-date', 'Fecha', 'Por defecto es la de hoy. Cambiala si la compra es de otro día.',
                 'next'),
            step('/buy/create/simple', 'buy-sign', 'Seña', 'Si le dejaste seña al proveedor, activá el interruptor y cargá el importe.',
                 'next'),
            step('/buy/create/simple', 'buy-items', 'Productos',
                 'Cargá cada producto con su cantidad y precio. Al completar una fila se agrega otra. Después tocá Continuar.',
                 'check', condicion='complete', confirmar=True),
            step('/buy/create/simple', 'form-confirm', 'Guardar la compra', 'Revisá el total y tocá "Confirmar" para guardar la compra.',
                 'event', evento='purchase-created'),
            *list_action_steps('/buy', 'cada compra'),
        ],
    },
]


def create_tutorials(apps, schema_editor):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    for order, data in enumerate(TUTORIALS, start=1):
        data = dict(data)
        steps = data.pop('pasos')
        tutorial = Tutorial.objects.create(orden=order, **data)
        TutorialPaso.objects.bulk_create([
            TutorialPaso(tutorial=tutorial, orden=step_order, **step_data)
            for step_order, step_data in enumerate(steps, start=1)
        ])


def delete_tutorials(apps, schema_editor):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Tutorial.objects.filter(clave__in=[data['clave'] for data in TUTORIALS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('tutorial', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_tutorials, delete_tutorials),
    ]
