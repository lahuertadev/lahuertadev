# from rest_framework.test import APITestCase
# from rest_framework import status
# from .models import Cliente
# from localidad.models import Localidad
# from municipio.models import Municipio
# from provincia.models import Provincia
# from tipo_facturacion.models import TipoFacturacion
# from tipo_condicion_iva.models import TipoCondicionIva
# from .serializers import ClientCreateUpdateSerializer
# from unittest.mock import patch, Mock, MagicMock


# class ClientViewSetTests(APITestCase):
#     def setUp(self):
#         '''
#         Configuración inicial de datos
#         '''
#         self.province = Provincia.objects.create(id='06', nombre='Buenos Aires')
#         self.city = Municipio.objects.create(id='060427', nombre='La Matanza', provincia=self.province)
#         self.district= Localidad.objects.create(id= '0642701009', nombre= 'Ramos Mejía', municipio= self.city)
#         self.facturation_type = TipoFacturacion.objects.create(id=1, descripcion= 'Testing')
#         self.iva_condition_type = TipoCondicionIva.objects.create(id=1, descripcion='Testing')
#         self.existing_client = Cliente.objects.create(
#             id= 1,
#             cuit= "20304050609",
#             razon_social="Testing",
#             cuenta_corriente= 100.50,
#             domicilio= "Toscano 716",
#             localidad= self.district,
#             tipo_facturacion= self.facturation_type,
#             condicion_IVA= self.iva_condition_type,
#             telefono= "+54 11 1234 5678",
#             fecha_inicio_ventas= "2023-01-01",
#             nombre_fantasia= "Fantasia S.A.",
#             estado= True
#         )
#         self.url = '/client/'
#         self.serialized_data = ClientCreateUpdateSerializer(self.existing_client).data

#     @patch('localidad.models.Localidad')
#     @patch('localidad.services.DistrictService.create_or_get_district')
#     @patch('cliente.repositories.ClientRepository.create_client')
#     def test_given_valid_data_should_create_client_successfully(self, mock_create_client, mock_create_or_get_district, MockLocalidad):
#         '''
#         REVISAR EL TEST. HAY UN PROBLEMA EN COMO TOMA EL OBJETO LOCALIDAD EN EL MOCK
#         DE CLIENTE_CREATE. TIENE QUE TENER <Localidad: 0642701009> Y NO HAY FORMA DE QUE QUEDE. 
        
#         '''
#         mock_create_or_get_district.return_value = {
#             "status": "success",
#             "message": "La localidad ya existe",
#             'district': self.district
#         }
        
#         mock_localidad = MagicMock()
#         mock_localidad.id = '0642701009'
#         mock_localidad.__repr__.side_effect = lambda: f"<Localidad: {mock_localidad.id}>"

#         mock_create_client.return_value = {
#             "id": 3,
#             "cuit": "20304050610",
#             "razon_social": "Testing 2",
#             "cuenta_corriente": "100.50",
#             "domicilio": "Toscano 716",
#             'localidad': mock_localidad,
#             "tipo_facturacion": {
#                 "id": 1,
#                 "descripcion": "Testing"
#             },
#             "condicion_IVA": {
#                 "id": 1,
#                 "descripcion": "Testing"
#             },
#             "telefono": "+54 11 1234 5678",
#             "fecha_inicio_ventas": "2023-01-01",
#             "nombre_fantasia": "Fantasia S.A.",
#             "estado": True
#         }

#         client_data = {
#             "cuit": "20304050610",
#             "razon_social": "Testing 2",
#             "cuenta_corriente": 100.50,
#             "domicilio": "Toscano 716",
#             "localidad": {
#                 "id": "0642701009",
#                 "nombre": "Ramos Mejía",
#                 "municipio": {
#                     "id": "060427",
#                     "nombre": "La Matanza",
#                     "provincia": {
#                         "id": "06",
#                         "nombre": "Buenos Aires"
#                     }
#                 }
#             },
#             "tipo_facturacion": 1,
#             "condicion_IVA": 1,
#             "telefono": "+54 11 1234 5678",
#             "fecha_inicio_ventas": "2023-01-01",
#             "nombre_fantasia": "Fantasia S.A.",
#             "estado": True
#         }

#         response = self.client.post(self.url, client_data, format='json')

#         self.assertEqual(response.status_code, status.HTTP_201_CREATED)
#         self.assertEqual(response.data["cuit"], client_data["cuit"])
#         self.assertEqual(response.data["razon_social"], client_data["razon_social"])

#         mock_create_or_get_district.assert_called_once_with(client_data["localidad"])
#         mock_create_client.assert_called_once()