import pytest
from unittest.mock import Mock

from novedad.service import NewsService
from novedad.exceptions import NewsNotFoundException


@pytest.fixture
def repository():
    return Mock()


@pytest.fixture
def service(repository):
    return NewsService(news_repository=repository)


def test_mark_as_seen_ok(service, repository):
    user = Mock()
    news = Mock()
    record = Mock()
    repository.get_visible_by_id.return_value = news
    repository.mark_as_seen.return_value = record

    result = service.mark_as_seen(1, user)

    repository.get_visible_by_id.assert_called_once_with(1, user)
    repository.mark_as_seen.assert_called_once_with(news, user)
    assert result is record


def test_mark_as_seen_not_visible_raises(service, repository):
    repository.get_visible_by_id.return_value = None

    with pytest.raises(NewsNotFoundException):
        service.mark_as_seen(1, Mock())

    repository.mark_as_seen.assert_not_called()
