def build_purchase_payment_service():
    from .repositories import PurchasePaymentRepository
    from cheque.repositories import CheckRepository
    from cheque.service import CheckService
    from .service import PurchasePaymentService

    check_repo = CheckRepository()
    check_service = CheckService(check_repo)
    payment_repo = PurchasePaymentRepository()

    return PurchasePaymentService(payment_repo, check_repo, check_service)
