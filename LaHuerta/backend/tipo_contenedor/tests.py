from django.test import TestCase

# Create your tests here.
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from .models import TipoContenedor
from .repositories import ContainerTypeRepository
from producto.models import Producto
from tipo_unidad.models import TipoUnidad
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor


class UnitTypeViewSetTest(APITestCase):

    def setUp(self):
        '''
        Configuración de datos iniciales
        ''' 
        self.existing_container_type = TipoContenedor.objects.create(id=1, descripcion='Cajon')
        self.existing_container_type_2 = TipoContenedor.objects.create(id=2, descripcion='Jaula')
        self.existing_unit_type = TipoUnidad.objects.create(id=1, descripcion='Kilo')
        self.existing_category = Categoria.objects.create(id=1, descripcion='Frutas')

        self.existing_product = Producto.objects.create(
            id=1,
            descripcion = 'Manzana',
            categoria = self.existing_category,
            tipo_contenedor = self.existing_container_type,
            tipo_unidad = self.existing_unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.2 
        )
        self.url = '/container_type/'

    #! GET
    def test_should_return_all_container_types(self):
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 2)

    #! POST
    def test_given_valid_data_should_create_container_type_successfully(self):
        data = {
            'descripcion':'Pallet'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(TipoContenedor.objects.filter(descripcion='Pallet').exists())

    def test_given_existing_container_type_description_should_return_already_exists(self):
        data = {
            'descripcion':'Cajon'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    #! PUT
    def test_given_existing_container_type_id_and_valid_data_should_update_container_type_successfully(self):
        data = {
            'descripcion':'Pallet'
        }
        response = self.client.put(f'{self.url}{self.existing_container_type.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['descripcion'], data['descripcion'])

    def test_given_nonexistent_container_type_id_should_return_not_found(self):
        id = 999
        data = {
            'descripcion':'Pallet'
        }
        response = self.client.put(f'{self.url}{id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'Tipo de contenedor no encontrado.')

    def test_given_invalid_data_should_return_bad_request(self):
        data ={
            'descripcion':'Too long string for description'
        }
        response = self.client.put(f'{self.url}{self.existing_container_type.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('tipo_contenedor.repositories.ContainerTypeRepository.get_container_by_id', side_effect=Exception('Ocurrió un error inesperado'))
    def test_put_given_internal_server_error_should_return_500(self, mock_get_container_by_id):
        data = {
            'descripcion': 'Galon'
        }
        response = self.client.put(f'{self.url}{self.existing_unit_type.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Ocurrió un error inesperado')
        mock_get_container_by_id.assert_called()
        mock_get_container_by_id.assert_called_once()
        mock_get_container_by_id.assert_called_with(str(self.existing_unit_type.id))

    #! DELETE
    def test_given_existing_container_type_id_should_delete_container_type_successfully(self):
        id = 2
        response = self.client.delete(f'{self.url}{id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.data['message'], 'Tipo de contenedor eliminado exitosamente')

    def test_given_invalid_container_type_id_should_response_container_type_not_found(self):
        id = 999
        response = self.client.delete(f'{self.url}{id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'El tipo de contenedor seleccionado no existe')

    def test_given_container_type_with_products_should_response_bad_request(self):
        id = 1
        response = self.client.delete(f'{self.url}{id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'El tipo de contenedor seleccionado tiene productos asociados')

    @patch('tipo_contenedor.repositories.ContainerTypeRepository.get_container_by_id', side_effect=Exception('Ocurrió un error inesperado'))
    def test_delete_given_internal_server_error_should_return_500(self, mock_get_container_by_id):
        response = self.client.delete(f'{self.url}{self.existing_unit_type.id}/')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Ocurrió un error inesperado')
        mock_get_container_by_id.assert_called()
        mock_get_container_by_id.assert_called_once()
        mock_get_container_by_id.assert_called_with(str(self.existing_unit_type.id))