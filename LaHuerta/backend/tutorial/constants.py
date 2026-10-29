from django.db import models


class TutorialStatus(models.TextChoices):
    STARTED = 'iniciado', 'Iniciado'
    COMPLETED = 'completado', 'Completado'
    SKIPPED = 'omitido', 'Omitido'


class StepAdvance(models.TextChoices):
    '''Qué tiene que pasar para que el tutorial siga al paso siguiente.'''
    NEXT = 'next', 'Siguiente (paso de recorrido)'
    ROUTE = 'route', 'Llegar a una ruta'
    EVENT = 'event', 'Guardado exitoso (evento de la pantalla)'
    CHECK = 'check', 'Condición del elemento'


class StepCheck(models.TextChoices):
    '''Condición que tiene que cumplir el elemento resaltado (avance = check).'''
    FILLED = 'filled', 'Campo completo'
    DATE = 'date', 'Fecha completa'
    COMPLETE = 'complete', 'Marcado como completo por la pantalla'


class StepDevice(models.TextChoices):
    DESKTOP = 'desktop', 'Escritorio'
    MOBILE = 'mobile', 'Celular'


# Largo máximo de la clave de un tutorial y de los nombres data-tour de las pantallas.
TUTORIAL_KEY_MAX_LENGTH = 60
