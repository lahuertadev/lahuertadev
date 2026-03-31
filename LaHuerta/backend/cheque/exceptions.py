class CheckNotFoundException(Exception):
    pass


class CheckAlreadyEndorsedException(Exception):
    pass


class CheckInvalidStateException(Exception):
    pass


class CheckLinkedToPaymentException(Exception):
    pass
