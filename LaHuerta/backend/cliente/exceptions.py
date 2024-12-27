class ClientNotFoundException(Exception):
    '''
    Lanzada si no se encuentra el cliente
    '''
    pass

class CuitAlreadyExistsException(Exception):
    '''
    Lanzada si el cuit ya se encuentra registrado
    '''
    pass

class BusinessNameAlreadyExistsException(Exception):
    '''
    Lanzada si la razon social ya existe
    '''
    pass