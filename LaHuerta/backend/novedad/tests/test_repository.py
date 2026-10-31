import pytest
from datetime import timedelta
from django.utils import timezone

from autenticacion.models import Usuario
from novedad.models import Novedad, NovedadUsuario
from novedad.repositories import NewsRepository


@pytest.mark.django_db
class TestNewsRepository:
    def setup_method(self):
        self.repository = NewsRepository()
        self.today = timezone.localdate()
        self.employee = self._make_user('empleado', Usuario.EMPLOYEE)

    def _make_user(self, username, role):
        return Usuario.objects.create_user(username=username, email=f'{username}@test.com', password='x', role=role)

    def _make_news(self, titulo='Novedad', days_ago=0, vigente_hasta=None, rol_destino=None, activa=True):
        return Novedad.objects.create(
            titulo=titulo,
            descripcion='Descripción',
            fecha_publicacion=self.today - timedelta(days=days_ago),
            vigente_hasta=vigente_hasta,
            rol_destino=rol_destino,
            activa=activa,
        )

    def _titles(self, queryset):
        return [news.titulo for news in queryset]

    # ------------------------- MODELO --------------------------
    def test_vigente_hasta_defaults_to_30_days(self):
        news = self._make_news()
        assert news.vigente_hasta == self.today + timedelta(days=30)

    def test_vigente_hasta_explicit_is_kept(self):
        news = self._make_news(vigente_hasta=self.today + timedelta(days=15))
        assert news.vigente_hasta == self.today + timedelta(days=15)

    # ------------------------- PENDIENTES (INICIO) -------------
    def test_pending_includes_current_not_seen(self):
        self._make_news('Vigente')
        result = self.repository.get_visible_for_user(self.employee, pending=True)
        assert self._titles(result) == ['Vigente']
        assert result[0].seen is False

    def test_pending_excludes_not_yet_published(self):
        self._make_news('Futura', days_ago=-1)
        assert self._titles(self.repository.get_visible_for_user(self.employee, pending=True)) == []

    def test_pending_excludes_expired(self):
        self._make_news('Vencida', days_ago=40, vigente_hasta=self.today - timedelta(days=1))
        assert self._titles(self.repository.get_visible_for_user(self.employee, pending=True)) == []

    def test_pending_includes_last_day_of_validity(self):
        self._make_news('Último día', days_ago=30, vigente_hasta=self.today)
        assert self._titles(self.repository.get_visible_for_user(self.employee, pending=True)) == ['Último día']

    def test_pending_excludes_seen(self):
        news = self._make_news('Vista')
        NovedadUsuario.objects.create(novedad=news, usuario=self.employee)
        assert self._titles(self.repository.get_visible_for_user(self.employee, pending=True)) == []

    def test_seen_by_other_user_still_pending(self):
        news = self._make_news('Vista por otro')
        other = self._make_user('otro', Usuario.EMPLOYEE)
        NovedadUsuario.objects.create(novedad=news, usuario=other)
        assert self._titles(self.repository.get_visible_for_user(self.employee, pending=True)) == ['Vista por otro']

    def test_excludes_inactive(self):
        self._make_news('Inactiva', activa=False)
        assert self._titles(self.repository.get_visible_for_user(self.employee)) == []

    def test_ordered_most_recent_first(self):
        self._make_news('Vieja', days_ago=5)
        self._make_news('Nueva', days_ago=1)
        assert self._titles(self.repository.get_visible_for_user(self.employee, pending=True)) == ['Nueva', 'Vieja']

    # ------------------------- HISTORIAL -----------------------
    def test_history_includes_seen_and_expired(self):
        seen_news = self._make_news('Vista', days_ago=1)
        NovedadUsuario.objects.create(novedad=seen_news, usuario=self.employee)
        self._make_news('Vencida', days_ago=40, vigente_hasta=self.today - timedelta(days=10))

        result = list(self.repository.get_visible_for_user(self.employee))

        assert self._titles(result) == ['Vista', 'Vencida']
        assert [news.seen for news in result] == [True, False]

    def test_history_excludes_not_yet_published(self):
        self._make_news('Futura', days_ago=-3)
        assert self._titles(self.repository.get_visible_for_user(self.employee)) == []

    # ------------------------- ROLES ---------------------------
    def test_employee_sees_all_users_and_own_role_only(self):
        self._make_news('Todos', days_ago=3)
        self._make_news('Empleados', days_ago=2, rol_destino=Usuario.EMPLOYEE)
        self._make_news('Administración', days_ago=1, rol_destino=Usuario.ADMINISTRATOR)

        assert self._titles(self.repository.get_visible_for_user(self.employee)) == ['Empleados', 'Todos']

    def test_administrator_does_not_see_employee_news(self):
        admin = self._make_user('admin', Usuario.ADMINISTRATOR)
        self._make_news('Empleados', days_ago=2, rol_destino=Usuario.EMPLOYEE)
        self._make_news('Administración', days_ago=1, rol_destino=Usuario.ADMINISTRATOR)

        assert self._titles(self.repository.get_visible_for_user(admin)) == ['Administración']

    def test_superuser_sees_all_roles(self):
        superuser = self._make_user('super', Usuario.SUPERUSER)
        self._make_news('Empleados', days_ago=2, rol_destino=Usuario.EMPLOYEE)
        self._make_news('Administración', days_ago=1, rol_destino=Usuario.ADMINISTRATOR)

        assert self._titles(self.repository.get_visible_for_user(superuser)) == ['Administración', 'Empleados']

    # ------------------------- GET BY ID -----------------------
    def test_get_visible_by_id_found(self):
        news = self._make_news()
        assert self.repository.get_visible_by_id(news.id, self.employee).id == news.id

    def test_get_visible_by_id_other_role_returns_none(self):
        news = self._make_news(rol_destino=Usuario.ADMINISTRATOR)
        assert self.repository.get_visible_by_id(news.id, self.employee) is None

    def test_get_visible_by_id_nonexistent_returns_none(self):
        assert self.repository.get_visible_by_id(9999, self.employee) is None

    # ------------------------- MARCAR COMO VISTA ---------------
    def test_mark_as_seen_creates_record(self):
        news = self._make_news()
        record = self.repository.mark_as_seen(news, self.employee)

        assert record.novedad_id == news.id
        assert record.usuario_id == self.employee.id
        assert record.vista_en is not None

    def test_mark_as_seen_twice_does_not_duplicate(self):
        news = self._make_news()
        self.repository.mark_as_seen(news, self.employee)
        self.repository.mark_as_seen(news, self.employee)

        assert NovedadUsuario.objects.filter(novedad=news, usuario=self.employee).count() == 1
