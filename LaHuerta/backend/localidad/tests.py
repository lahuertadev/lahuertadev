from rest_framework.test import APITestCase
from rest_framework import status
from municipio.models import Municipio
from provincia.models import Provincia
from .models import Localidad

class DistrictViewSetTests(APITestCase):
    def setUp(self):
        '''
        Configuración de datos iniciales
        '''
        self.existing_province = Provincia.objects.create(id='01', nombre='TestProvince')
        self.existing_city = Municipio.objects.create(id='123456', nombre='TestCity', provincia=self.existing_province)
        self.existing_district = Localidad.objects.create(id='0123456789', nombre= 'TestDistrict', municipio=self.existing_city)
        self.url = '/district/create_if_not_exists/'

    def test_given_new_province_new_city_and_new_district_should_create_all_of_them(self):
        province = {
            'id': '02',
            'nombre': 'TestingProvince'
        }

        city = {
            'id':'234567',
            'nombre': 'TestingCity',
            'provincia':province
        }

        district = {
            'id':'1234567890',
            'nombre':'TestingDistrict',
            'municipio':city
        }

        response = self.client.post(self.url, district, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Localidad creada exitosamente')
        self.assertTrue(Provincia.objects.filter(id='02').exists())
        self.assertTrue(Municipio.objects.filter(id='234567').exists())
        self.assertTrue(Localidad.objects.filter(id='1234567890').exists())

    def test_given_new_district_but_already_province_and_city_on_database_should_create_district(self):
        province = {
            'id': '01',
            'nombre': 'TestProvince'
        }

        city = {
            'id':'123456',
            'nombre': 'TestCity',
            'provincia':province
        }

        district = {
            'id':'1234567890',
            'nombre':'TestingDistrict',
            'municipio':city
        }

        response = self.client.post(self.url, district, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Localidad creada exitosamente')
        self.assertTrue(Provincia.objects.filter(id='01').exists())
        self.assertTrue(Municipio.objects.filter(id='123456').exists())
        self.assertTrue(Localidad.objects.filter(id='1234567890').exists())

    def test_given_new_district_and_new_city_but_same_province_should_create_district_and_city(self):
        province = {
            'id': '01',
            'nombre': 'TestProvince'
        }

        city = {
            'id':'012345',
            'nombre': 'TestCity',
            'provincia':province
        }

        district = {
            'id':'1234567890',
            'nombre':'TestingDistrict',
            'municipio':city
        }

        response = self.client.post(self.url, district, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Localidad creada exitosamente')
        self.assertTrue(Provincia.objects.filter(id='01').exists())
        self.assertTrue(Municipio.objects.filter(id='012345').exists())
        self.assertTrue(Localidad.objects.filter(id='1234567890').exists())

    def test_given_invalid_district_data_should_returns_bad_request(self):
        province = {
            'id': '02',
            'nombre': 'TestProvince'
        }

        city = {
            'id':'012345',
            'nombre': 'TestCity',
            'provincia':province
        }

        district = {
            'id':'1234567890123',
            'nombre':'TestingDistrict',
            'municipio':city
        }

        response = self.client.post(self.url, district, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Localidad.objects.filter(id='1234567890').exists())

    def test_given_invalid_city_data_should_returns_bad_request(self):
        province = {
            'id': '02',
            'nombre': 'TestProvince'
        }

        city = {
            'id':'01234512',
            'nombre': 'TestCity',
            'provincia':province
        }

        district = {
            'id':'0123456788',
            'nombre':'TestingDistrict',
            'municipio':city
        }

        response = self.client.post(self.url, district, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Municipio.objects.filter(id='01234512').exists())
        self.assertFalse(Localidad.objects.filter(id='0123456788').exists())

    def test_given_invalid_province_data_should_returns_bad_request(self):
        province = {
            'id': '021',
            'nombre': 'TestProvince'
        }

        city = {
            'id':'01234567',
            'nombre': 'TestCity',
            'provincia':province
        }

        district = {
            'id':'0123456788',
            'nombre':'TestingDistrict',
            'municipio':city
        }

        response = self.client.post(self.url, district, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Provincia.objects.filter(id='021').exists())
        self.assertFalse(Municipio.objects.filter(id='012345').exists())
        self.assertFalse(Localidad.objects.filter(id='0123456788').exists())

    def test_given_district_that_already_exists_should_returns_ok(self):
        province = {
            'id': '02',
            'nombre': 'TestProvince'
        }

        city = {
            'id':'012345',
            'nombre': 'TestCity',
            'provincia':province
        }

        district = {
            'id':'0123456789',
            'nombre':'TestingDistrict',
            'municipio':city
        }

        response = self.client.post(self.url, district, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'La localidad ya existe')
        self.assertTrue(Provincia.objects.filter(id='02').exists())
        self.assertTrue(Municipio.objects.filter(id='012345').exists())
        self.assertTrue(Localidad.objects.filter(id='0123456789').exists())