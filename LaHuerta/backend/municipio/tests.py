from rest_framework.test import APITestCase
from rest_framework import status
from .models import Municipio
from provincia.models import Provincia

class CityViewSetTests(APITestCase):
    
    def setUp(self):
        '''
        Configuración de datos iniciales
        '''
        self.existing_province = Provincia.objects.create(id='01', nombre='TestProvince')
        self.existing_city = Municipio.objects.create(id='01', nombre='TestCity', provincia=self.existing_province)
        self.url = '/city/create_if_not_exists/'
        
    def test_given_new_province_and_new_city_data_should_create_city(self):
        province = {
            'id':'02',
            'nombre':'TestProvince'
        }
        data = {
            'id':'02',
            'nombre':'Test2',
            'provincia':province
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Municipio creado exitosamente')
        self.assertTrue(Provincia.objects.filter(id='02').exists())
        self.assertTrue(Municipio.objects.filter(id='02').exists())

    def test_given_existing_province_id_and_new_city_should_create_city_only(self):
        province = {
            'id': '01',
            'nombre':'TestProvince'
        }
        data = {
            'id': '02',
            'nombre': 'Test2',
            'provincia':province
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Municipio creado exitosamente')
        self.assertTrue(Municipio.objects.filter(id='02').exists())

    def test_given_existing_city_should_returns_city_already_exists(self):
        province = {
            'id': '01',
            'nombre':'TestProvince'
        }
        data = {
            'id': '01',
            'nombre': 'TestCity',
            'provincia':province
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'El municipio ya existe')
        self.assertTrue(Municipio.objects.filter(id='01').exists())

    def test_given_invalid_province_but_valid_city_data_should_returns_bad_request(self):
        province = {
            'id': '1234',
            'nombre':'TestProvince'
        }
        data = {
            'id': '123456',
            'nombre': 'TestCity',
            'provincia':province
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Municipio.objects.filter(id='123456').exists())

    def test_given_invalid_city_but_valid_province_data_should_returns_bad_request(self):
        province = {
            'id': '12',
            'nombre':'TestProvince'
        }
        data = {
            'id': '12345615',
            'nombre': 'TestCity',
            'provincia':province
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Municipio.objects.filter(id='123456').exists())

    def test_given_invalid_hole_data_should_returns_bad_request(self):
        province = {
            'id': '123456',
            'nombre':'TestProvince'
        }
        data = {
            'id': '12345678',
            'nombre': 'TestCity',
            'provincia':province
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Municipio.objects.filter(id='123456').exists())

