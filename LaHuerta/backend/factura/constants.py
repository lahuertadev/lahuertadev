from decimal import Decimal

# Mapeo de alícuota (%) → código AFIP para AgregarIva
AFIP_IVA_CODES = {
    Decimal('0'):    3,
    Decimal('2.5'):  9,
    Decimal('5'):    8,
    Decimal('10.5'): 4,
    Decimal('21'):   5,
    Decimal('27'):   6,
}

DEBIT_NOTE_CODES = {2, 7, 12, 52}
CREDIT_NOTE_CODES = {3, 8, 13, 53}

# Tipos donde el precio de cada ítem viene manual del frontend (no se resuelve de lista de precios)
MANUAL_PRICE_CODES = DEBIT_NOTE_CODES | CREDIT_NOTE_CODES

DEBIT_NOTE_TO_INVOICE_CODE = {
    2:  1,   # ND A → Factura A
    7:  6,   # ND B → Factura B
    12: 11,  # ND C → Factura C
    52: 51,  # ND M → Factura M
}
