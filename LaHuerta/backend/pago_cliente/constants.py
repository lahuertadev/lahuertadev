from django.db import models

class PaymentState(models.TextChoices):
    VIGENTE = 'VIGENTE', 'Vigente'
    ANULADO = 'ANULADO', 'Anulado'
