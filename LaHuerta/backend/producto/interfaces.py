from abc import ABC, abstractmethod

class IProductRepository(ABC):
    
    @abstractmethod
    def get_all(self, description=None, category=None, container_type=None):
        """
        Retorna productos, opcionalmente filtrados.
        """
        pass

    @abstractmethod
    def get_by_id(self, id):
        """
        Retorna un producto por id o lanza ProductNotFoundException.
        """
        pass

    @abstractmethod
    def verify_products_with_category_id(self, category_id):
        """
        True si existe algún producto asociado a la categoría.
        """
        pass

    @abstractmethod
    def verify_products_with_container_type_id(self, container_id):
        """
        True si existe algún producto asociado al tipo de contenedor.
        """
        pass

    @abstractmethod
    def verify_products_with_unit_type_id(self, unit_id):
        """
        True si existe algún producto asociado al tipo de unidad.
        """
        pass

    @abstractmethod
    def create(self, data):
        """
        Crea y retorna un producto.
        """
        pass

    @abstractmethod
    def update(self, product, validated_data):
        """
        Actualiza y retorna un producto.
        """
        pass

    @abstractmethod
    def delete(self, product):
        """
        Elimina un producto.
        """
        pass