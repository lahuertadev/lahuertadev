from .constants import TutorialStatus
from .exceptions import TutorialNotFoundException


class TutorialService:

    def __init__(self, tutorial_repository):
        self.tutorial_repository = tutorial_repository

    def change_status(self, key, user, status):
        '''
        Registra el estado del tutorial para el usuario. Solo puede registrar los que le corresponden por rol. 
        '''
        tutorial = self.tutorial_repository.get_visible_by_key(key, user)
        if not tutorial:
            raise TutorialNotFoundException('Tutorial no encontrado.')

        record = self.tutorial_repository.get_progress(tutorial, user)
        if record and record.estado == TutorialStatus.COMPLETED:
            return record
        return self.tutorial_repository.save_status(tutorial, user, status)
