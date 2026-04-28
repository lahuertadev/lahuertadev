from .interfaces import IBuyEmptyRepository
from .models import CompraVacio


class BuyEmptyRepository(IBuyEmptyRepository):

    def create_empties(self, buy, empties):
        for empty in empties:
            CompraVacio.objects.create(
                compra=buy,
                tipo_contenedor=empty['tipo_contenedor'],
                cantidad=empty['cantidad'],
                precio_unitario=empty['precio_unitario'],
            )

    def replace_empties(self, buy, empties):
        CompraVacio.objects.filter(compra=buy).delete()
        self.create_empties(buy, empties)
