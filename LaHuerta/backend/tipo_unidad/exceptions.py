class UnitTypeHasProductsException(Exception):
    '''
    Lanzada cuando el tipo de unidad tiene productos asociados.
    '''
    pass

class UnitTypeNotFoundException(Exception):
    '''
    Lanzada cuando no se encuentra el tipo de unidad.
    '''
    pass

class UnitTypeAlreadyExistsException(Exception):
    '''
    Lanzada si ya existe el tipo de unidad.
    '''
    pass

class UnitTypeMeasurementLockedException(Exception):
    '''
    Lanzada al cambiar el tipo de medición de un tipo de unidad que tiene productos.
    '''
    pass
