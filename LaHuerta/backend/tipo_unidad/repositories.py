from .models import TipoUnidad
from .interfaces import IUnitTypeRepository

class UnitTypeRepository(IUnitTypeRepository):
    
    def get_all_unit_types(self):
        '''
        Obtiene todos los tipos de unidad.
        '''
        return TipoUnidad.objects.all()
    
    def get_unit_type_by_id(self, id):
        '''
        Obtiene el tipo de unidad por su id
        '''
        unit_type = TipoUnidad.objects.filter(id=id).first()
        return unit_type
    
    def create_unit_type(self, data):
        '''
        Crea un nuevo tipo de unidad
        '''
        type_unit = TipoUnidad(**data)
        type_unit.save()
        return type_unit
    
    def modify_unit_type(self, id, data):
        '''
        Modifica un tipo de unidad
        '''
        unit_type = self.get_unit_type_by_id(id)
        unit_type.descripcion = data.get('descripcion', unit_type.descripcion)
        unit_type.save()

    def destroy_unit_type(self, id):
        '''
        Elimina un tipo de unidad
        '''
        unit_type = self.get_unit_type_by_id(id)
        unit_type.delete()
