from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from .models import Producto
from tipo_contenedor.models import TipoContenedor 
from tipo_unidad.models import TipoUnidad
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from lista_precios_producto.models import ListaPreciosProducto
from lista_precios.models import ListaPrecios
from factura.models import Factura
from tipo_factura.models import TipoFactura
from factura_producto.models import FacturaProducto
from cliente.models import Cliente
from localidad.models import Localidad
from municipio.models import Municipio
from provincia.models import Provincia
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
from compra_producto.models import CompraProducto
from compra.models import Compra
from proveedor.models import Proveedor
from mercado.models import Mercado

class ProductViewSetTest(APITestCase):

    @classmethod
    def setUpTestData(cls):
        '''
        Configuración de datos iniciales
        ''' 
        cls.existing_container_type = TipoContenedor.objects.create(id=1, descripcion='Cajon')
        cls.existing_unit_type = TipoUnidad.objects.create(id=1, descripcion='Kilo')
        cls.existing_category = Categoria.objects.create(id=1, descripcion='Frutas')

        cls.existing_product = Producto.objects.create(
            id=1,
            descripcion = 'Manzana',
            categoria = cls.existing_category,
            tipo_contenedor = cls.existing_container_type,
            tipo_unidad = cls.existing_unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=18.0 
        )

        cls.existing_product_2 = Producto.objects.create(
            id=2,
            descripcion = 'Banana',
            categoria = cls.existing_category,
            tipo_contenedor = cls.existing_container_type,
            tipo_unidad = cls.existing_unit_type,
            cantidad_por_bulto=12,
            peso_aproximado=20.0 
        )

        cls.existing_product_3 = Producto.objects.create(
            id=3,
            descripcion = 'Pera',
            categoria = cls.existing_category,
            tipo_contenedor = cls.existing_container_type,
            tipo_unidad = cls.existing_unit_type,
            cantidad_por_bulto=20,
            peso_aproximado=22.0 
        )

        cls.existing_product_4 = Producto.objects.create(
            id=4,
            descripcion = 'Durazno',
            categoria = cls.existing_category,
            tipo_contenedor = cls.existing_container_type,
            tipo_unidad = cls.existing_unit_type,
            cantidad_por_bulto=20,
            peso_aproximado=22.0 
        )

        cls.existing_bill_type = TipoFactura.objects.create(
            id = 1,
            descripcion = 'A'
        )

        # For Product_Bill

        cls.existing_facturation_type = TipoFacturacion.objects.create(
            id = 1,
            descripcion = 'Test facturation type'
        )

        cls.existing_condition_iva = TipoCondicionIva.objects.create(
            id = 1,
            descripcion = 'Test condition'
        )
        
        cls.existing_province = Provincia.objects.create(
            id = '01',
            nombre = 'Test province'
        )

        cls.existing_city = Municipio.objects.create(
            id = '012345',
            nombre = 'Test city',
            provincia = cls.existing_province
        )
    
        cls.existing_district = Localidad.objects.create(
            id = "12345678",
            nombre = "Test district",
            municipio = cls.existing_city
        )

        cls.existing_client = Cliente.objects.create(
            id = 1,
            cuit = "23377921739",
            razon_social = "Test legal name",
            cuenta_corriente = 0,
            domicilio = "Test address",
            localidad = cls.existing_district,
            tipo_facturacion = cls.existing_facturation_type,
            condicion_IVA = cls.existing_condition_iva,
            telefono = '1234567890',
            fecha_inicio_ventas = timezone.now(),
            nombre_fantasia = 'Test name',
            estado = True
        )

        cls.existing_bill = Factura.objects.create(
            id = 1,
            fecha = timezone.now(),
            importe = 150.00,
            tipo_factura = cls.existing_bill_type,
            cliente = cls.existing_client
        )

        cls.existing_product_bill = FacturaProducto.objects.create(
            id = 1,
            producto = cls.existing_product_3,
            factura = cls.existing_bill,
            cantidad_producto = 10,
            precio_unitario = 100,
            precio_bulto = 150
        )

        # For Product_PriceList

        cls.existing_price_list = ListaPrecios.objects.create(
            id = 1,
            nombre= "Lista 1",
            descripcion = "Lista Clientes que cumplen"
        )

        cls.product_list_price = ListaPreciosProducto.objects.create(
            id = 1,
            lista_precios = cls.existing_price_list,
            producto = cls.existing_product,
            precio_unitario = 10,
            precio_bulto = 100
        )

        # For Product_Buys
        cls.existing_market = Mercado.objects.create(
            id = 1,
            descripcion = 'Test Market'
        )

        cls.existing_supplier = Proveedor.objects.create(
            id = 1,
            nombre = 'Test name',
            puesto = 1,
            nave = 1,
            telefono = '1234567890',
            cuenta_corriente = 100.00,
            nombre_fantasia = 'Test name fantasy',
            mercado = cls.existing_market
        )
        
        cls.existing_buy = Compra.objects.create(
            id = 1,
            fecha = timezone.now(),
            bultos = 10,
            importe = 100.00,
            senia = 10,
            proveedor = cls.existing_supplier
        )

        cls.existing_product_buys = CompraProducto.objects.create(
            id = 1,
            producto = cls.existing_product_4,
            compra = cls.existing_buy,
            cantidad_producto = 10,
            precio_bulto = 100.0,
            precio_unitario = 10.0
        )
        
        cls.url = '/product/'

    #! GET
    def test_should_return_all_products(self):
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 4)

    #! POST
    def test_given_valid_data_should_create_product_successfully(self):
        data = {
                "descripcion": "Manzana4",
                "categoria": self.existing_category.id,
                "tipo_contenedor": self.existing_container_type.id,
                "tipo_unidad": self.existing_unit_type.id,
                "cantidad_por_bulto": 10,
                "peso_aproximado": 1.2
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['descripcion'], data['descripcion'])
        self.assertTrue(Producto.objects.filter(descripcion='Manzana4').exists())

    def test_given_existing_product_description_should_return_already_exists(self):
        # Arrange
        data = {
            "descripcion": self.existing_product_2.descripcion,
            "categoria": self.existing_category.id,
            "tipo_contenedor": self.existing_container_type.id,
            "tipo_unidad": self.existing_unit_type.id,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2
        }

        expected_error = {
            'descripcion':[
                "producto with this descripcion already exists."
            ]
        }

        # Act
        response = self.client.post(self.url, data)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), expected_error)

    @patch('producto.repositories.ProductRepository.create_product', side_effect=Exception('Ocurrió un error inesperado en el servidor'))
    def test_post_given_internal_server_error_should_return_500(self, mock_create_product):
        data = {
            "descripcion": 'uva',
            "categoria": self.existing_category.id,
            "tipo_contenedor": self.existing_container_type.id,
            "tipo_unidad": self.existing_unit_type.id,
            "cantidad_por_bulto": 10,
            "peso_aproximado": 1.2
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Ocurrió un error inesperado en el servidor')
        mock_create_product.assert_called_once()
        mock_create_product.assert_called()

        args, kwargs = mock_create_product.call_args

        #* Esto es asi porque son los datos serializados. 
        expected_validated_data = {
        "descripcion": 'uva',
        "categoria": self.existing_category,  # Es una instancia, no es un ID
        "tipo_contenedor": self.existing_container_type, 
        "tipo_unidad": self.existing_unit_type, 
        "cantidad_por_bulto": 10,
        "peso_aproximado": 1.2
        }

        self.assertEqual(args[0], expected_validated_data)
        mock_create_product.assert_called_with(expected_validated_data)


    #! PATCH
    def test_given_existing_product_id_and_valid_data_should_update_product_successfully(self):
        # Arrange
        data = {
            'descripcion':'Manzanas Verdes',
            'cantidad_por_bulto':45
        }

        # Act
        response = self.client.patch(f'{self.url}{self.existing_product.id}/', data, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['descripcion'], data['descripcion'])
        self.assertEqual(response.data['cantidad_por_bulto'], data['cantidad_por_bulto'])

    def test_given_invalid_product_id_should_response_product_not_found(self):
        # Arrange
        id = 999
        data = {
            'descripcion':'Manzanas Verdes',
            'categoria_id':2
        }

        # Act
        response = self.client.patch(f'{self.url}{id}/', data, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], f'Producto con ID {id} no encontrado')

    def test_given_product_description_already_exists_should_return_bad_request(self):
        # Arrange
        data = {
            'descripcion':'Manzana',
            'categoria_id':2
        }

        expected_error = {
            'descripcion': [
                "producto with this descripcion already exists."
            ]
        }

        # Act
        response = self.client.patch(f'{self.url}{self.existing_product_2.id}/', data, format='json')
        
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), expected_error)

    @patch('producto.repositories.ProductRepository.get_product_by_id', side_effect=Exception('Ocurrió un error inesperado'))
    def test_patch_given_internal_server_error_should_return_500(self, mock_get_product_by_id):
        # Arrange
        data = {
            'descripcion': 'Pera'
        }

        # Act
        response = self.client.patch(f'{self.url}{self.existing_product.id}/', data, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Ocurrió un error inesperado')
        mock_get_product_by_id.assert_called()
        mock_get_product_by_id.assert_called_once()
        mock_get_product_by_id.assert_called_with(str(self.existing_product.id))

    #! DELETE
    def test_given_existing_product_id_should_delete_container_type_successfully(self):

        #* Arrange
        id = 2

        #* Act
        response = self.client.delete(f'{self.url}{id}/')

        #* Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.data['detail'], 'Producto eliminado exitosamente')

    def test_given_invalid_product_id_should_response_container_type_not_found(self):

        #* Arrange
        id = 999

        #* Act
        response = self.client.delete(f'{self.url}{id}/')

        #* Assert
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], f'Producto con ID {id} no encontrado')

    def test_given_product_asociated_to_a_product_list_should_response_bad_request(self):

        #* Act
        response = self.client.delete(f'{self.url}{self.existing_product.id}/')

        #* Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'El producto está asociado a una lista de precios y no puede ser eliminado.')

    def test_given_product_asociated_to_a_bill_should_response_bad_request(self):

        #* Act
        response = self.client.delete(f'{self.url}{self.existing_product_3.id}/')

        #* Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'El producto está asociado a una factura y no puede ser eliminado.')

    def test_given_product_asociated_to_buy_should_response_bad_request(self):

        #* Act
        response = self.client.delete(f'{self.url}{self.existing_product_4.id}/')

        #* Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'El producto está asociado a una compra y no puede ser eliminado.')

    @patch('producto.repositories.ProductRepository.get_product_by_id', side_effect=Exception('Ocurrió un error inesperado'))
    def test_delete_given_internal_server_error_should_return_500(self, mock_get_product_by_id):

        #* Act
        response = self.client.delete(f'{self.url}{self.existing_product.id}/')

        #* Assert
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Ocurrió un error inesperado')
        mock_get_product_by_id.assert_called()
        mock_get_product_by_id.assert_called_once()
        mock_get_product_by_id.assert_called_with(str(self.existing_product.id))
