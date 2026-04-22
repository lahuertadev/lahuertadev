from abc import ABC, abstractmethod


class IBuyEmptyRepository(ABC):

    @abstractmethod
    def create_empties(self, buy, empties):
        pass

    @abstractmethod
    def replace_empties(self, buy, empties):
        pass
