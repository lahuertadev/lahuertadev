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
    path('auth/', include('autenticacion.urls')),
    path('', include('gasto.urls')),
    path('', include('tipo_gasto.urls')),
    path('', include('tipo_facturacion.urls')),
    path('', include('tipo_condicion_iva.urls')),
    path('', include('dia_entrega.urls')),
    path('', include('tipo_factura.urls')),
    path('', include('categoria.urls')),
    path('', include('tipo_contenedor.urls')),
    path('', include('tipo_unidad.urls')),
    path('', include('tipo_pago.urls')),
    path('', include('mercado.urls')),
    path('', include('banco.urls')),
    path('', include('cliente.urls')),
    path('', include('factura.urls')),
    path('', include('producto.urls')),
    path('', include('lista_precios.urls')),
    path('', include('proveedor.urls')),
    path('', include('compra.urls')),
    path('', include('pago.urls')),
    path('', include('cheque.urls')),
    path('', include('pago_factura.urls')),
    path('', include('localidad.urls')),
    path('', include('provincia.urls')),
    path('', include('municipio.urls')),
]
