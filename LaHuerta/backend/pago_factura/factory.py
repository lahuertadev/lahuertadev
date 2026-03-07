from .repositories import BillPaymentRepository
from .interfaces import IBillPaymentRepository
from .service import BillPaymentService


def build_bill_payment_service(
    bill_payment_repository: IBillPaymentRepository | None = None,
):
    bill_payment_repository = bill_payment_repository or BillPaymentRepository()

    return BillPaymentService(
        bill_payment_repository=bill_payment_repository,
    )
