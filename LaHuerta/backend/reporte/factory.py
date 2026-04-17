from .repositories import ReportRepository
from .service import ReportService
from cliente.repositories import ClientRepository


def build_report_service(report_repository=None, client_repository=None) -> ReportService:
    return ReportService(
        report_repository=report_repository or ReportRepository(),
        client_repository=client_repository or ClientRepository(),
    )
