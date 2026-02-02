from django.urls import path
from .views import (
    RegisterView, 
    LoginView,
    LogoutView,
    CurrentUserView,
    csrf,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    PasswordChangeView,
    EmailVerificationView,
    ResendVerificationCodeView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('csrf/', csrf, name='csrf'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('password-change/', PasswordChangeView.as_view(), name='password-change'),
    path('verify-email/', EmailVerificationView.as_view(), name='verify-email'),
    path('resend-verification-code/', ResendVerificationCodeView.as_view(), name='resend-verification-code'),
]

