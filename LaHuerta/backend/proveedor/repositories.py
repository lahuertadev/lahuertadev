from .models import Proveedor
from .interfaces import ISupplierRepository
from django.db.models import Q


class SupplierRepository(ISupplierRepository):

    def get_all_suppliers(self, searchQuery=None, mercado=None):
        queryset = Proveedor.objects.select_related('mercado').all()

        if searchQuery:
            queryset = queryset.filter(
                Q(nombre__icontains=searchQuery) |
                Q(nombre_fantasia__icontains=searchQuery)
            )

        if mercado:
            queryset = queryset.filter(mercado__descripcion__icontains=mercado)

        return queryset

    def get_supplier_by_id(self, id):
        return Proveedor.objects.select_related('mercado').filter(id=id).first()

    def create_supplier(self, data):
        supplier = Proveedor(**data)
        supplier.cuenta_corriente = 0
        supplier.save()
        return supplier

    def modify_supplier(self, supplier, data):
        safe_data = data.copy()
        safe_data.pop('cuenta_corriente', None)

        for key, value in safe_data.items():
            setattr(supplier, key, value)

        supplier.save()
        return supplier

    def delete_supplier(self, supplier):
        supplier.delete()
