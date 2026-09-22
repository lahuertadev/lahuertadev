class ClientPaymentNotFoundException(Exception):
    pass


class PaymentTypeChangeBlockedException(Exception):
    pass


class CheckAlreadyExistsException(Exception):
    pass


class PaymentDeletionBlockedException(Exception):
    pass
