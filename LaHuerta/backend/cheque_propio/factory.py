from .repositories import OwnCheckRepository
from .service import OwnCheckService


def build_own_check_service(own_check_repository=None):
    own_check_repository = own_check_repository or OwnCheckRepository()
    return OwnCheckService(own_check_repository=own_check_repository)
