from django.db import models
from django.db.models import Q
from cliente.models import Cliente
from proveedor.models import Proveedor
from .constants import NUMBER_MAX_LENGTH, DESCRIPTION_MAX_LENGTH


class Contacto(models.Model):
    '''
    Teléfono de contacto, con descripción y email opcionales, de un cliente o de un proveedor.
    Cada contacto pertenece a un solo dueño: tiene cargada una de las FKs y la otra en NULL.
    '''
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, null=True, blank=True, related_name='contactos')
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, null=True, blank=True, related_name='contactos')
    numero = models.CharField(max_length=NUMBER_MAX_LENGTH)
    descripcion = models.CharField(max_length=DESCRIPTION_MAX_LENGTH, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)

    def __str__(self):
        return f'{self.numero} ({self.descripcion})' if self.descripcion else self.numero

    class Meta:
        db_table = 'contacto'
        ordering = ['id']
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(cliente__isnull=False, proveedor__isnull=True)
                    | Q(cliente__isnull=True, proveedor__isnull=False)
                ),
                name='contacto_un_solo_duenio',
            ),
        ]
