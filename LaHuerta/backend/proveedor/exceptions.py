class SupplierNotFoundException(Exception):
    '''
    Lanzada si no se encuentra el proveedor
    '''
    pass


class SupplierNameAlreadyExistsException(Exception):
    '''
    Lanzada si el nombre ya se encuentra registrado
    '''
    pass
