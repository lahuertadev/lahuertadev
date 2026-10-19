from django.db import models


class EmptyMovementType(models.TextChoices):
    '''
    Tipos de movimiento de vacíos.
    '''
    LOAD   = 'CARGA', 'Carga'
    RETURN = 'DEVOLUCION', 'Devolución'
