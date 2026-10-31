from .exceptions import NewsNotFoundException


class NewsService:

    def __init__(self, news_repository):
        self.news_repository = news_repository

    def mark_as_seen(self, news_id, user):
        '''
        Marca la novedad como vista para el usuario. Solo puede marcar las que le corresponden
        por rol; repetir la acción no duplica el registro.
        '''
        news = self.news_repository.get_visible_by_id(news_id, user)
        if not news:
            raise NewsNotFoundException('Novedad no encontrada.')
        return self.news_repository.mark_as_seen(news, user)
