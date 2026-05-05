from django.db import models


class EstadoCheque(models.Model):
    descripcion = models.CharField(unique=True, max_length=20)
    is_system = models.BooleanField(default=False)

    def __str__(self):
        return self.descripcion

    class Meta:
        db_table = 'estado_cheque'
