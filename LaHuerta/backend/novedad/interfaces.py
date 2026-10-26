from abc import ABC, abstractmethod


class INewsRepository(ABC):

    @abstractmethod
    def get_visible_for_user(self, user, pending=None):
        pass

    @abstractmethod
    def get_visible_by_id(self, id, user):
        pass

    @abstractmethod
    def mark_as_seen(self, news, user):
        pass
