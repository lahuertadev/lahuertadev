class BuyNotFoundException(Exception):
    pass


class BuySupplierChangeBlockedException(Exception):
    pass


class BuyWithPaymentsException(Exception):
    '''La compra no se puede eliminar porque la cubre un pago (vigente o anulado).'''
    pass
