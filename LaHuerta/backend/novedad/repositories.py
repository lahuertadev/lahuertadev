from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from autenticacion.models import Usuario
from .models import Novedad, NovedadUsuario
from .interfaces import INewsRepository


class NewsRepository(INewsRepository):

    def _visible_for_user(self, user):
        '''
        Novedades activas, ya publicadas y dirigidas al rol del usuario (o a todos).
        El superusuario ve todas. Cada una viene anotada con `seen` para ese usuario.
        '''
        today = timezone.localdate()
        queryset = Novedad.objects.filter(activa=True, fecha_publicacion__lte=today)
        if user.role != Usuario.SUPERUSER:
            queryset = queryset.filter(Q(rol_destino__isnull=True) | Q(rol_destino=user.role))
        return queryset.select_related('tutorial').annotate(
            seen=Exists(NovedadUsuario.objects.filter(novedad=OuterRef('pk'), usuario=user)),
        )

    def get_visible_for_user(self, user, pending=None):
        queryset = self._visible_for_user(user)
        if pending:
            queryset = queryset.filter(seen=False, vigente_hasta__gte=timezone.localdate())
        return queryset.order_by('-fecha_publicacion', '-id')

    def get_visible_by_id(self, id, user):
        return self._visible_for_user(user).filter(id=id).first()

    def mark_as_seen(self, news, user):
        record, _ = NovedadUsuario.objects.get_or_create(novedad=news, usuario=user)
        return record
