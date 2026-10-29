from django.db.models import OuterRef, Prefetch, Q, Subquery
from autenticacion.models import Usuario
from .models import Tutorial, TutorialPaso, TutorialUsuario
from .interfaces import ITutorialRepository


class TutorialRepository(ITutorialRepository):

    def _visible_for_user(self, user):
        '''
        Tutoriales activos dirigidos al rol del usuario (o a todos). El superusuario ve todos.
        '''
        queryset = Tutorial.objects.filter(activo=True)
        if user.role != Usuario.SUPERUSER:
            queryset = queryset.filter(Q(rol_destino__isnull=True) | Q(rol_destino=user.role))
        return queryset

    def get_visible_for_user(self, user):
        '''
        Cada tutorial viene con sus pasos en orden y anotado con `estado`: el avance del usuario
        (None si nunca lo empezó).
        '''
        progress = TutorialUsuario.objects.filter(tutorial=OuterRef('pk'), usuario=user).values('estado')[:1]
        return (
            self._visible_for_user(user)
            .annotate(estado=Subquery(progress))
            .prefetch_related(Prefetch('pasos', queryset=TutorialPaso.objects.order_by('orden')))
            .order_by('orden', 'id')
        )

    def get_visible_by_key(self, key, user):
        return self._visible_for_user(user).filter(clave=key).first()

    def get_progress(self, tutorial, user):
        return TutorialUsuario.objects.filter(tutorial=tutorial, usuario=user).first()

    def save_status(self, tutorial, user, status):
        record, _ = TutorialUsuario.objects.update_or_create(
            tutorial=tutorial,
            usuario=user,
            defaults={'estado': status},
        )
        return record
