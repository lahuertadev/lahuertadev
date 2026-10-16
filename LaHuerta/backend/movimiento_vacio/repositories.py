from django.db.models import Q
from .models import MovimientoVacio, MovimientoVacioContenedor
from .interfaces import IEmptyMovementRepository


def _base_queryset():
    return (
        MovimientoVacio.objects
        .select_related('proveedor__mercado')
        .prefetch_related('contenedores__tipo_contenedor')
    )


class EmptyMovementRepository(IEmptyMovementRepository):

    def get_all(self, supplier_name=None, movement_type=None, date_from=None, date_to=None, amount=None):
        qs = _base_queryset()

        if supplier_name:
            qs = qs.filter(
                Q(proveedor__nombre__icontains=supplier_name) |
                Q(proveedor__nombre_fantasia__icontains=supplier_name)
            )
        if movement_type:
            qs = qs.filter(tipo=movement_type)
        if date_from:
            qs = qs.filter(fecha__gte=date_from)
        if date_to:
            qs = qs.filter(fecha__lte=date_to)
        if amount is not None:
            qs = qs.filter(importe=amount)

        return qs.order_by('-fecha', '-id')

    def get_by_id(self, id):
        return _base_queryset().filter(id=id).first()

    def create(self, supplier, date, movement_type, receipt_number, amount):
        movement = MovimientoVacio(
            proveedor=supplier,
            fecha=date,
            tipo=movement_type,
            nro_comprobante=receipt_number,
            importe=amount,
        )
        movement.save()
        return movement

    def save(self, movement):
        movement.save()
        return movement

    def delete(self, movement):
        movement.delete()

    def create_containers(self, movement, containers):
        MovimientoVacioContenedor.objects.bulk_create([
            MovimientoVacioContenedor(
                movimiento_vacio=movement,
                tipo_contenedor=container['tipo_contenedor'],
                cantidad=container['cantidad'],
                precio_unitario=container['precio_unitario'],
            )
            for container in containers
        ])

    def replace_containers(self, movement, containers):
        MovimientoVacioContenedor.objects.filter(movimiento_vacio=movement).delete()
        self.create_containers(movement, containers)
