from .repositories import NewsRepository
from .service import NewsService


def build_news_service(news_repository=None):
    return NewsService(news_repository=news_repository or NewsRepository())
