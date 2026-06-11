# Facturación

## Objetivo
Gestionar la emisión de comprobantes comerciales: Remitos, Facturas electrónicas (A/B/C/M) y Notas de Débito (A/B/C/M) con integración a ARCA/AFIP mediante el servicio WSFEv1.

## Alcance
- Creación, edición y eliminación de Remitos
- Creación de Facturas electrónicas con CAE (ARCA/AFIP)
- Creación de Notas de Débito electrónicas asociadas a una Factura original
- Actualización automática de la cuenta corriente del cliente
- Vista de impresión para Facturas/ND (con QR AFIP) y para Remitos
- Listado con tabs separadas (Facturas / Remitos) y filtros

## Tipos de comprobante

| Tipo | Abreviatura | codigo_afip | Electrónico |
|---|---|---|---|
| Factura A | A | 1 | Sí |
| Factura B | B | 6 | Sí |
| Factura C | C | 11 | Sí |
| Factura M | M | 51 | Sí |
| Nota de Débito A | NDA | 2 | Sí |
| Nota de Débito B | NDB | 7 | Sí |
| Nota de Débito C | NDC | 12 | Sí |
| Nota de Débito M | NDM | 52 | Sí |
| Remito | R | null | No |

La regla para la selección automática del tipo de factura según la condición IVA del cliente:
- Responsable Inscripto (codigo_afip=1) → Factura A
- Todos los demás → Factura B

## Flujo de uso — Remito

1. Ir a Facturas → Nueva
2. Seleccionar cliente → el tipo se precarga automáticamente (Factura A o B según condición IVA)
3. Cambiar el tipo a Remito si se desea
4. Ingresar fecha e ítems (producto, cantidad, tipo de venta)
5. El precio se resuelve automáticamente desde la lista de precios del cliente
6. Confirmar → se asigna número de comprobante secuencial por tipo, sin contactar AFIP
7. `subtotal = total` (sin IVA para remitos)
8. La cuenta corriente del cliente aumenta en el valor del `total`

Se puede editar (fecha, cliente, productos) y eliminar siempre que no tenga pagos imputados.

## Flujo de uso — Factura electrónica (ARCA/AFIP)

1. Ir a Facturas → Nueva
2. Seleccionar cliente → el tipo de factura se precarga automáticamente según su condición IVA
3. Ingresar fecha e ítems con su alícuota de IVA por producto (default 10,5%, editable: 0%, 2,5%, 5%, 10,5%, 21%, 27%)
4. El precio se resuelve desde la lista de precios del cliente
5. Confirmar → el sistema:
   - Calcula `subtotal` (suma de `cantidad × precio` sin IVA)
   - Calcula `total` (suma de `cantidad × precio × (1 + iva_rate/100)` por ítem)
   - Se autentica con WSAA (con caché de token para evitar re-autenticaciones)
   - Emite el comprobante en WSFEv1 con `AgregarIva` por cada tasa distinta
   - Obtiene CAE, número de comprobante y fecha de vencimiento del CAE
6. La cuenta corriente del cliente aumenta en el valor del `total` (con IVA)

Una vez emitida (con CAE) la factura **no puede editarse ni eliminarse**.

## Flujo de uso — Nota de Débito

1. Ir a Facturas → Nueva
2. Seleccionar cliente y tipo Nota de Débito A/B/C/M
3. Seleccionar la factura original asociada (solo facturas del mismo tipo y con CAE)
4. Elegir cómo cargar los productos:
   - **Cargar todos**: pre-popula los ítems de la factura original con precios editables
   - **Individualmente**: tabla vacía, el usuario ingresa productos y precios manualmente
5. Los precios siempre son manuales para ND (no se consulta la lista de precios)
6. Confirmar → el sistema valida la compatibilidad de tipos y emite la ND en AFIP con referencia al comprobante original (`CbtesAsoc`)
7. La cuenta corriente del cliente aumenta en el `total` de la ND — **la ND no reemplaza ni anula la factura original**, ambas coexisten

## Validaciones importantes

**Remito:**
- El cliente debe tener lista de precios asignada
- Todos los productos deben tener precio en la lista del cliente

**Factura electrónica:**
- El tipo de factura debe ser compatible con la condición IVA del cliente (Factura A solo para Responsable Inscripto)
- No se puede editar ni eliminar una vez emitida por AFIP

**Nota de Débito:**
- Debe referenciar una factura original con CAE
- El tipo debe ser compatible: ND A → Factura A, ND B → Factura B, etc.
- No se puede hacer una ND sobre otra ND
- Todos los ítems deben tener precio ingresado manualmente
- No se puede eliminar la factura original si tiene NDs asociadas (PROTECT)

## Cuenta corriente del cliente

La cuenta corriente se actualiza automáticamente:
- **Creación**: aumenta en `total`
- **Edición de remito**: ajusta por la diferencia (`nuevo_total - viejo_total`)
- **Cambio de cliente en remito**: descuenta del cliente anterior, suma al nuevo
- **Eliminación de remito**: disminuye en `total`

Para facturas electrónicas y NDs: no se puede modificar ni eliminar (con CAE), por lo tanto la cuenta corriente solo puede aumentar.

## Cálculo de importes

```
subtotal = Σ (cantidad × precio_aplicado)   # sin IVA
total    = Σ (cantidad × precio_aplicado × (1 + iva_rate/100))  # con IVA por ítem
```

Para remitos: `subtotal == total` (sin IVA).

## Pantallas involucradas

- `/bill` — Listado con tabs Facturas / Remitos, filtros y badges por tipo
- `/bill/create` — Formulario de creación
- `/bill/edit/:id` — Formulario de edición (solo remitos sin pagos)
- `/bill/detail/:id` — Vista de detalle
- `/bill/print/:id` — Impresión de remito
- `/bill/invoice/:id` — Impresión de factura/ND con QR AFIP

## Integración ARCA/AFIP

- **Autenticación**: WSAA con caché de token en archivo JSON. Se renueva automáticamente al vencer.
- **Emisión**: WSFEv1 (`CompUltimoAutorizado` + `CrearFactura` + `AgregarIva` + `CAESolicitar`)
- **Ambientes**: homologación (`homologacion=True`) para desarrollo, producción para deployment real
- **Consumidor Final**: usa `tipo_doc=99` y `nro_doc=0` (sin identificación fiscal)

## Consideraciones

- El `numero_comprobante` para facturas electrónicas lo asigna AFIP, no el sistema
- El `numero_comprobante` para remitos lo asigna el sistema en forma secuencial por tipo
- El IVA de cada ítem se guarda en `factura_producto.iva_rate` con default 10,5%
- La vista de impresión de facturas muestra QR de AFIP — solo funciona correctamente en producción (los comprobantes de homologación no existen en el portal de AFIP)
- Pendiente: imputación de pagos de clientes a facturas específicas (backend implementado, frontend sin pantalla)
