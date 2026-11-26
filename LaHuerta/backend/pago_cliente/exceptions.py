class ClientPaymentNotFoundException(Exception):
    pass


class CheckAlreadyExistsException(Exception):
    pass


class PaymentCancelBlockedException(Exception):
    pass


class PaymentEditBlockedException(Exception):
    pass


class CheckEditBlockedException(Exception):
    pass
