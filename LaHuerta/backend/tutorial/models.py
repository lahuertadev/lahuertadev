from django.conf import settings
from django.db import models
from autenticacion.models import Usuario
from .constants import TutorialStatus, StepAdvance, StepCheck, StepDevice, TUTORIAL_KEY_MAX_LENGTH


class Tutorial(models.Model):
    '''
    Tutorial guiado de una pantalla. Sus pasos recorren la pantalla real: cada uno resalta el
    elemento marcado en el frontend con el atributo data-tour del mismo nombre.
    '''

    clave = models.SlugField(max_length=TUTORIAL_KEY_MAX_LENGTH, unique=True, help_text='No cambiarla: el avance de cada usuario se guarda con el tutorial.')
    titulo = models.CharField(max_length=120, help_text='Nombre de la pantalla. Ej. Clientes.')
    descripcion = models.CharField(max_length=300)
    seccion = models.CharField(max_length=60, help_text='Grupo del menú lateral. Ej. Clientes, Proveedores.')
    rol_destino = models.CharField(
        max_length=20, choices=Usuario.ROLE_CHOICES, blank=True, null=True,
        help_text='Si se deja vacío, lo ven todos los usuarios.',
    )
    orden = models.PositiveSmallIntegerField(default=0, help_text='Orden en la sección Tutoriales.')
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo

    class Meta:
        db_table = 'tutorial'
        ordering = ['orden', 'id']
        verbose_name = 'Tutorial'
        verbose_name_plural = 'Tutoriales'


class TutorialPaso(models.Model):
    '''
    Paso de un tutorial: en qué pantalla está, qué elemento resalta, qué explica y qué tiene que
    hacer el usuario para seguir.
    '''

    tutorial = models.ForeignKey(Tutorial, on_delete=models.CASCADE, related_name='pasos')
    orden = models.PositiveSmallIntegerField()
    ruta = models.CharField(max_length=120, help_text='Ruta del frontend. Ej. /client/create')
    elemento = models.CharField(max_length=TUTORIAL_KEY_MAX_LENGTH, help_text='Valor del atributo data-tour del elemento a resaltar.')
    titulo = models.CharField(max_length=120)
    descripcion = models.CharField(max_length=500)
    avance = models.CharField(max_length=10, choices=StepAdvance.choices)
    ruta_destino = models.CharField(max_length=120, blank=True, null=True, help_text='Avance "ruta": a qué ruta tiene que llegar.')
    evento = models.CharField(max_length=60, blank=True, null=True, help_text='Avance "evento": nombre del evento que emite la pantalla al guardar.')
    condicion = models.CharField(max_length=10, choices=StepCheck.choices, blank=True, null=True, help_text='Avance "condición".')
    confirmar = models.BooleanField(default=False, help_text='Avance "condición": se sigue con Continuar (para campos de texto).')
    opcional = models.BooleanField(default=False, help_text='Si el elemento no aparece, el paso se saltea.')
    solo_lectura = models.BooleanField(default=False, help_text='El elemento se muestra pero no se puede tocar.')
    listo_cuando = models.CharField(
        max_length=TUTORIAL_KEY_MAX_LENGTH, blank=True, null=True,
        help_text='data-tour de un elemento que indica que la pantalla cargó; un paso opcional se saltea recién cuando está.',
    )
    dispositivo = models.CharField(
        max_length=10, choices=StepDevice.choices, blank=True, null=True,
        help_text='Si se deja vacío, el paso va en escritorio y en celular.',
    )

    def __str__(self):
        return f'{self.tutorial} - {self.orden}. {self.titulo}'

    class Meta:
        db_table = 'tutorial_paso'
        ordering = ['tutorial', 'orden']
        verbose_name = 'Paso de tutorial'
        verbose_name_plural = 'Pasos de tutorial'
        constraints = [
            models.UniqueConstraint(fields=['tutorial', 'orden'], name='unique_tutorial_paso_orden'),
        ]


class TutorialUsuario(models.Model):
    '''
    Avance de un usuario en un tutorial guiado.
    '''

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tutorial = models.ForeignKey(Tutorial, on_delete=models.CASCADE)
    estado = models.CharField(max_length=20, choices=TutorialStatus.choices)
    fecha = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.usuario} - {self.tutorial} ({self.estado})'

    class Meta:
        db_table = 'tutorial_usuario'
        verbose_name = 'Tutorial de usuario'
        verbose_name_plural = 'Tutoriales de usuarios'
        constraints = [
            models.UniqueConstraint(fields=['usuario', 'tutorial'], name='unique_tutorial_usuario'),
        ]
