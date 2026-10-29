from abc import ABC, abstractmethod


class ITutorialRepository(ABC):

    @abstractmethod
    def get_visible_for_user(self, user):
        pass

    @abstractmethod
    def get_visible_by_key(self, key, user):
        pass

    @abstractmethod
    def get_progress(self, tutorial, user):
        pass

    @abstractmethod
    def save_status(self, tutorial, user, status):
        pass
