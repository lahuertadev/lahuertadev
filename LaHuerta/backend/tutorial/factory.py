from .repositories import TutorialRepository
from .service import TutorialService


def build_tutorial_service(tutorial_repository=None):
    return TutorialService(tutorial_repository=tutorial_repository or TutorialRepository())
