class PurchasePaymentNotFoundException(Exception):
    pass

class PaymentExceedsBalanceException(Exception):
    pass

class PaymentSupplierMismatchException(Exception):
    pass

class OwnCheckOtherSupplierException(Exception):
    pass

class PaymentEditBlockedException(Exception):
    pass
