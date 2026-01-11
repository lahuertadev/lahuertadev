from django.urls import path
from .views import RegisterView, LoginView, csrf

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('csrf/', csrf, name='csrf'),
]

