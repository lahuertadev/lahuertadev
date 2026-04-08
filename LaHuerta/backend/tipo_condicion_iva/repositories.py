from .models import TipoCondicionIva
from .interfaces import IConditionIvaTypeRepository

class ConditionIvaTypeRepository(IConditionIvaTypeRepository):
    
    def get_all(self):
        return TipoCondicionIva.objects.all()
    
    def get_by_id(self, id):
        return TipoCondicionIva.objects.get(id=id)

    def create(self, data):
        return TipoCondicionIva.objects.create(**data)

    def update(self, id, data):
        obj = self.get_by_id(id)

        obj.descripcion = data.get('descripcion', obj.descripcion)
        obj.save()

        return obj

    def delete(self, id):
        obj = self.get_by_id(id)
        obj.delete()
        return True
    

    
        