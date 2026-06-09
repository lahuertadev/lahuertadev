from django.db import migrations

# Códigos oficiales AFIP — WSFEv1
# Tipos no electrónicos (Remito, Ticket, Recibo, Presupuesto) quedan en NULL
AFIP_CODE_BY_ABREVIATURA = {
    "A":   1,   # Factura A
    "NDA": 2,   # Nota de Débito A
    "NCA": 3,   # Nota de Crédito A
    "B":   6,   # Factura B
    "NDB": 7,   # Nota de Débito B
    "NCB": 8,   # Nota de Crédito B
    "C":   11,  # Factura C
    "NDC": 12,  # Nota de Débito C
    "NCC": 13,  # Nota de Crédito C
    "M":   51,  # Factura M
    "NDM": 52,  # Nota de Débito M
    "NCM": 53,  # Nota de Crédito M
}

ND_TYPES_TO_CREATE = [
    {"descripcion": "Nota de Débito C", "abreviatura": "NDC", "codigo_afip": 12, "is_system": True},
    {"descripcion": "Nota de Débito M", "abreviatura": "NDM", "codigo_afip": 52, "is_system": True},
]


def align_afip_codes(apps, schema_editor):
    TipoFactura = apps.get_model("tipo_factura", "TipoFactura")

    # Crear NDC y NDM si no existen, actualizarlos si ya existen
    for data in ND_TYPES_TO_CREATE:
        TipoFactura.objects.update_or_create(
            abreviatura=data["abreviatura"],
            defaults=data,
        )

    # Actualizar codigo_afip en todos los tipos que ya existen
    for obj in TipoFactura.objects.all():
        codigo = AFIP_CODE_BY_ABREVIATURA.get(obj.abreviatura)
        if codigo is not None and obj.codigo_afip != codigo:
            obj.codigo_afip = codigo
            obj.save(update_fields=["codigo_afip"])


def reverse_align(apps, schema_editor):
    TipoFactura = apps.get_model("tipo_factura", "TipoFactura")
    TipoFactura.objects.filter(abreviatura__in=["NDC", "NDM"]).delete()
    revert = {"C": None, "M": None, "NCC": None, "NCM": None}
    for obj in TipoFactura.objects.all():
        if obj.abreviatura in revert:
            obj.codigo_afip = revert[obj.abreviatura]
            obj.save(update_fields=["codigo_afip"])


class Migration(migrations.Migration):

    dependencies = [
        ("tipo_factura", "0006_populate_codigo_afip"),
    ]

    operations = [
        migrations.RunPython(align_afip_codes, reverse_align),
    ]
