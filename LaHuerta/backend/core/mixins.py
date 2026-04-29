from .exceptions import SystemEntityException


class SystemProtectedMixin:
    def _check_system_protected(self, instance):
        if instance.is_system:
            raise SystemEntityException('Este registro es de sistema y no puede ser modificado ni eliminado.')
