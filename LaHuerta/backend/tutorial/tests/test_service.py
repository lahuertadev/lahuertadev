import pytest
from unittest.mock import Mock

from tutorial.constants import TutorialStatus
from tutorial.exceptions import TutorialNotFoundException
from tutorial.service import TutorialService


@pytest.fixture
def repository():
    return Mock()


@pytest.fixture
def service(repository):
    return TutorialService(tutorial_repository=repository)


def test_change_status_without_previous_record_saves(service, repository):
    user = Mock()
    tutorial = Mock()
    saved = Mock()
    repository.get_visible_by_key.return_value = tutorial
    repository.get_progress.return_value = None
    repository.save_status.return_value = saved

    result = service.change_status('clients', user, TutorialStatus.STARTED)

    repository.get_visible_by_key.assert_called_once_with('clients', user)
    repository.save_status.assert_called_once_with(tutorial, user, TutorialStatus.STARTED)
    assert result is saved


def test_change_status_not_visible_raises(service, repository):
    repository.get_visible_by_key.return_value = None

    with pytest.raises(TutorialNotFoundException):
        service.change_status('inexistente', Mock(), TutorialStatus.STARTED)

    repository.save_status.assert_not_called()


def test_change_status_from_skipped_to_completed_saves(service, repository):
    user = Mock()
    tutorial = Mock()
    repository.get_visible_by_key.return_value = tutorial
    repository.get_progress.return_value = Mock(estado=TutorialStatus.SKIPPED)

    service.change_status('clients', user, TutorialStatus.COMPLETED)

    repository.save_status.assert_called_once_with(tutorial, user, TutorialStatus.COMPLETED)


@pytest.mark.parametrize('new_status', [TutorialStatus.STARTED, TutorialStatus.SKIPPED, TutorialStatus.COMPLETED])
def test_change_status_completed_is_final(service, repository, new_status):
    completed = Mock(estado=TutorialStatus.COMPLETED)
    repository.get_visible_by_key.return_value = Mock()
    repository.get_progress.return_value = completed

    result = service.change_status('clients', Mock(), new_status)

    repository.save_status.assert_not_called()
    assert result is completed
