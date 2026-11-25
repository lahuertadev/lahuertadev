# Solapas Activos / Inactivos del listado (parámetro state): el campo estado del cliente es un booleano.
class ClientState:
    ACTIVE = 'ACTIVO'
    INACTIVE = 'INACTIVO'
    CHOICES = [ACTIVE, INACTIVE]
