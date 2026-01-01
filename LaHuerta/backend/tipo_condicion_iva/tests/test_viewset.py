from tipo_condicion_iva.views import ConditionIvaTypeViewSet
from tipo_condicion_iva.interfaces import IConditionIvaTypeRepository

class FakeRepo(IConditionIvaTypeRepository):

    def get_all(self):
        return []

    def create(self, data):
        self.created = data

def test_viewset_list_empty():
    viewset = ConditionIvaTypeViewSet(repository=FakeRepo())
    response = viewset.list(None)
    assert response.status_code == 200
    assert response.data == []
