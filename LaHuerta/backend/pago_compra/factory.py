def build_purchase_payment_service():
    from .repositories import PurchasePaymentRepository
    from cheque.repositories import CheckRepository
    from cheque.service import CheckService
    from proveedor.repositories import SupplierRepository
    from .service import PurchasePaymentService

    check_repo = CheckRepository()
    check_service = CheckService(check_repo)
    payment_repo = PurchasePaymentRepository()
    supplier_repo = SupplierRepository()

    return PurchasePaymentService(payment_repo, check_repo, check_service, supplier_repo)
