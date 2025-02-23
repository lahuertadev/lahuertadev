class UnitTypeHasProductsException(Exception):
    '''
    Lanzada cuando la categoría tiene productos asociados.
    '''
    pass

class UnitTypeNotFoundException(Exception):
    '''
    Lanzada cuando no se encuentra la categoría.
    '''
    pass

class UnitTypeAlreadyExistsException(Exception):
    '''
    Lanzada si ya existe el tipo de unidad.
    '''
    pass