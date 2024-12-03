from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Provincia

class ProvinceViewSetTests(APITestCase):
    
    def setUp(self):
        '''
        Configuración de datos iniciales
        '''
        self.existing_province = Provincia.objects.create(id='01', nombre='Test')
        self.url = '/province/create_if_not_exists/'
        
    def test_given_valid_data_should_create_province(self):
        data = {
            'id':'02',
            'nombre':'Test2'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Provincia creada exitosamente')
        self.assertTrue(Provincia.objects.filter(id='02').exists())

    def test_given_existing_province_id_should_returns_already_exists(self):
        data = {
            'id': '01',
            'nombre': 'Test2'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'La provincia ya existe')

    def test_given_invalid_data_should_returns_bad_request(self):
        data = {
            'id':'123',
            'nombre': 'Test2'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('id', response.data)

    def test_given_missing_field_in_data_should_returns_bad_request(self):
        data = {
            'id':'02'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nombre', response.data)