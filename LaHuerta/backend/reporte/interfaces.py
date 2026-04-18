from abc import ABC, abstractmethod
from datetime import date


class IReportRepository(ABC):

    @abstractmethod
    def get_bills(self, client_id: int, date_from: date, date_to: date):
        pass

    @abstractmethod
    def get_payments(self, client_id: int, date_from: date, date_to: date):
        pass
