from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from .models import Categoria
from .repositories import CategoryRepository
from producto.models import Producto
from tipo_unidad.models import TipoUnidad
from tipo_contenedor.models import TipoContenedor

class CategoryViewSetTests(APITestCase):

    def setUp(self):
        '''
        Configuración de datos iniciales
        '''
        self.existing_category = Categoria.objects.create(id=1, descripcion='Fruta')
        self.existing_category_2 = Categoria.objects.create(id=10, descripcion='Horticolas')
        self.existing_unit_type = TipoUnidad.objects.create(id=1, descripcion='Kilo')
        self.existing_container_type = TipoContenedor.objects.create(id=1, descripcion='Cajon')
        self.existing_product = Producto.objects.create(
            id=1,
            descripcion = 'Manzana',
            categoria = self.existing_category_2,
            tipo_contenedor = self.existing_container_type,
            tipo_unidad = self.existing_unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.2 
        )
        self.url = '/category/'

    #! GET
    def test_should_return_all_categories(self):
        response = self.client.get(self.url)

        self.assertEqual(len(response.data), 2)

    #! POST
    def test_given_valid_data_should_create_category_successfully(self):
        data = {
            'descripcion':'Verdura'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Categoria.objects.filter(id=11).exists())

    def test_given_existing_category_description_should_return_already_exists(self):
        data = {
            'id':2,
            'descripcion':'Fruta'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Categoria.objects.filter(id=2).exists())

    #! PUT
    def test_given_existing_category_id_and_valid_data_should_update_category_successfully(self):
        data = {
            "descripcion":'Verdura'
        }
        response = self.client.put(f'{self.url}{self.existing_category.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['descripcion'], data['descripcion'])

    def test_given_nonexistent_category_id_should_return_not_found(self):
        id = 999
        data = {
            'descripcion':'Verduras'
        }
        response = self.client.put(f'{self.url}{id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'La categoría seleccionada no existe')

    def test_given_invalid_data_should_return_bad_request(self):
        data ={
            'descripcion':'Too long string for description'
        }
        response = self.client.put(f'{self.url}{self.existing_category.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('categoria.repositories.CategoryRepository.get_category_by_id', side_effect=Exception('Ocurrió un error inesperado'))
    def test_put_given_internal_server_error_should_return_500(self, mock_get_category_by_id):
        data = {
            'descripcion': 'Verduras'
        }
        response = self.client.put(f'{self.url}{self.existing_category.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Ocurrió un error inesperado')
        mock_get_category_by_id.assert_called()
        mock_get_category_by_id.assert_called_once()
        mock_get_category_by_id.assert_called_with(str(self.existing_category.id))

    #! DELETE
    def test_given_existing_category_id_should_delete_category_successfully(self):
        id = 1
        response = self.client.delete(f'{self.url}{id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.data['message'], 'La categoría fue eliminada exitosamente')

    def test_given_invalid_category_id_should_response_category_not_found(self):
        id = 2
        response = self.client.delete(f'{self.url}{id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'La categoría seleccionada no existe')

    def test_given_category_with_products_should_response_bad_request(self):
        id = 10
        response = self.client.delete(f'{self.url}{id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'La categoría seleccionada tiene productos asociados')

    @patch('categoria.repositories.CategoryRepository.get_category_by_id', side_effect=Exception('Ocurrió un error inesperado'))
    def test_delete_given_internal_server_error_should_return_500(self, mock_get_category):
        response = self.client.delete(f'{self.url}{self.existing_category.id}/')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Ocurrió un error inesperado')
        mock_get_category.assert_called()
        mock_get_category.assert_called_once()
        mock_get_category.assert_called_with(str(self.existing_category.id))