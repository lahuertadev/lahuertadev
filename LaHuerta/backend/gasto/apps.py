from django.apps import AppConfig


class GastoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gasto' #! Tiene que coincidir con la app declarada en el INSTALLED_APPS del archivo Settings.py
