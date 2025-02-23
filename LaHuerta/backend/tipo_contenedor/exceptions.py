class ContainerHasProductsException(Exception):
    '''
    Lanzada cuando la categoría tiene productos asociados.
    '''
    pass

class ContainerNotFoundException(Exception):
    '''
    Lanzada cuando no se encuentra la categoría.ß
    '''
    pass