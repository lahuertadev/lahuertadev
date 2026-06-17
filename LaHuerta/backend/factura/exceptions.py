class BillNotFoundException(Exception):
    pass

class BillHasPaymentsException(Exception):
    pass

class PriceNotFoundError(Exception):
    pass

class BillAlreadyEmittedException(Exception):
    pass

class DebitNoteValidationError(Exception):
    pass

class CreditNoteValidationError(Exception):
    pass