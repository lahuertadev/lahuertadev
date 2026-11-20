class PurchasePaymentNotFoundException(Exception):
    pass

class PaymentExceedsBalanceException(Exception):
    pass

class PaymentSupplierMismatchException(Exception):
    pass

class PaymentEditBlockedException(Exception):
    pass

class PaymentApplicationsExceedAmountException(Exception):
    pass

class OwnCheckNotAvailableException(Exception):
    pass

class PaymentCancelBlockedException(Exception):
    pass
