import pytest

from autenticacion.models import Usuario
from tutorial.constants import TutorialStatus
from tutorial.models import Tutorial, TutorialPaso, TutorialUsuario
from tutorial.repositories import TutorialRepository


@pytest.mark.django_db
class TestTutorialRepository:
    def setup_method(self):
        self.repository = TutorialRepository()
        self.employee = self._make_user('empleado', Usuario.EMPLOYEE)

    def _make_user(self, username, role):
        return Usuario.objects.create_user(username=username, email=f'{username}@test.com', password='x', role=role)

    def _make_tutorial(self, clave='clients', orden=1, rol_destino=None, activo=True):
        return Tutorial.objects.create(
            clave=clave, titulo=clave.title(), descripcion='Descripción', seccion='Clientes',
            orden=orden, rol_destino=rol_destino, activo=activo,
        )

    def _make_step(self, tutorial, orden, elemento='list-add'):
        return TutorialPaso.objects.create(
            tutorial=tutorial, orden=orden, ruta='/client', elemento=elemento,
            titulo='Paso', descripcion='Texto', avance='next',
        )

    def _keys(self, queryset):
        return [tutorial.clave for tutorial in queryset]

    # ------------------------- LISTADO -------------------------
    def test_visible_empty(self):
        assert list(self.repository.get_visible_for_user(self.employee)) == []

    def test_visible_ordered_by_orden(self):
        self._make_tutorial('purchases', orden=2)
        self._make_tutorial('clients', orden=1)
        assert self._keys(self.repository.get_visible_for_user(self.employee)) == ['clients', 'purchases']

    def test_visible_excludes_inactive(self):
        self._make_tutorial('clients', activo=False)
        assert self._keys(self.repository.get_visible_for_user(self.employee)) == []

    def test_visible_by_role(self):
        self._make_tutorial('clients')
        self._make_tutorial('users', orden=2, rol_destino=Usuario.ADMINISTRATOR)
        assert self._keys(self.repository.get_visible_for_user(self.employee)) == ['clients']

    def test_superuser_sees_all(self):
        self._make_tutorial('clients')
        self._make_tutorial('users', orden=2, rol_destino=Usuario.ADMINISTRATOR)
        superuser = self._make_user('socio', Usuario.SUPERUSER)
        assert self._keys(self.repository.get_visible_for_user(superuser)) == ['clients', 'users']

    def test_visible_includes_steps_in_order(self):
        tutorial = self._make_tutorial()
        self._make_step(tutorial, 2, 'client-cuit')
        self._make_step(tutorial, 1, 'list-add')

        result = self.repository.get_visible_for_user(self.employee).first()

        assert [step.elemento for step in result.pasos.all()] == ['list-add', 'client-cuit']

    def test_visible_annotates_status_of_user(self):
        tutorial = self._make_tutorial()
        other = self._make_user('otro', Usuario.EMPLOYEE)
        TutorialUsuario.objects.create(tutorial=tutorial, usuario=other, estado=TutorialStatus.COMPLETED)

        assert self.repository.get_visible_for_user(self.employee).first().estado is None

        TutorialUsuario.objects.create(tutorial=tutorial, usuario=self.employee, estado=TutorialStatus.SKIPPED)
        assert self.repository.get_visible_for_user(self.employee).first().estado == TutorialStatus.SKIPPED

    # ------------------------- POR CLAVE -----------------------
    def test_get_visible_by_key_found(self):
        tutorial = self._make_tutorial()
        assert self.repository.get_visible_by_key('clients', self.employee) == tutorial

    def test_get_visible_by_key_not_found(self):
        assert self.repository.get_visible_by_key('inexistente', self.employee) is None

    def test_get_visible_by_key_other_role(self):
        self._make_tutorial('users', rol_destino=Usuario.ADMINISTRATOR)
        assert self.repository.get_visible_by_key('users', self.employee) is None

    # ------------------------- AVANCE --------------------------
    def test_get_progress(self):
        tutorial = self._make_tutorial()
        assert self.repository.get_progress(tutorial, self.employee) is None
        record = TutorialUsuario.objects.create(tutorial=tutorial, usuario=self.employee, estado=TutorialStatus.STARTED)
        assert self.repository.get_progress(tutorial, self.employee) == record

    def test_save_status_creates_record(self):
        tutorial = self._make_tutorial()

        record = self.repository.save_status(tutorial, self.employee, TutorialStatus.STARTED)

        assert record.pk is not None
        assert record.estado == TutorialStatus.STARTED

    def test_save_status_updates_existing_without_duplicating(self):
        tutorial = self._make_tutorial()
        TutorialUsuario.objects.create(tutorial=tutorial, usuario=self.employee, estado=TutorialStatus.STARTED)

        record = self.repository.save_status(tutorial, self.employee, TutorialStatus.SKIPPED)

        assert record.estado == TutorialStatus.SKIPPED
        assert TutorialUsuario.objects.filter(usuario=self.employee).count() == 1
