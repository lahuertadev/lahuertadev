from .models import Mercado
from .interfaces import IMarketRepository


class MarketRepository(IMarketRepository):

    def get_all_markets(self):
        return Mercado.objects.all()

    def get_market_by_id(self, id):
        return Mercado.objects.filter(id=id).first()

    def create_market(self, data):
        market = Mercado(**data)
        market.save()
        return market

    def modify_market(self, market, data):
        for key, value in data.items():
            setattr(market, key, value)
        market.save()
        return market

    def delete_market(self, market):
        market.delete()
