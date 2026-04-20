"""
URL configuration for lahuertabackend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('autenticacion.urls')),
    path('api/', include('gasto.urls')),
    path('api/', include('tipo_gasto.urls')),
    path('api/', include('tipo_facturacion.urls')),
    path('api/', include('tipo_condicion_iva.urls')),
    path('api/', include('dia_entrega.urls')),
    path('api/', include('tipo_factura.urls')),
    path('api/', include('categoria.urls')),
    path('api/', include('tipo_contenedor.urls')),
    path('api/', include('tipo_unidad.urls')),
    path('api/', include('tipo_pago.urls')),
    path('api/', include('mercado.urls')),
    path('api/', include('banco.urls')),
    path('api/', include('cliente.urls')),
    path('api/', include('factura.urls')),
    path('api/', include('producto.urls')),
    path('api/', include('lista_precios.urls')),
    path('api/', include('lista_precios_producto.urls')),
    path('api/', include('proveedor.urls')),
    path('api/', include('compra.urls')),
    path('api/', include('estado_cheque.urls')),
    path('api/', include('cheque.urls')),
    path('api/', include('cheque_propio.urls')),
    path('api/', include('reporte.urls')),
    path('api/', include('pago_cliente.urls')),
    path('api/', include('pago_factura.urls')),
    path('api/', include('pago_compra.urls')),
    path('api/', include('tipo_venta.urls')),
    path('api/', include('localidad.urls')),
    path('api/', include('provincia.urls')),
    path('api/', include('municipio.urls')),
]
