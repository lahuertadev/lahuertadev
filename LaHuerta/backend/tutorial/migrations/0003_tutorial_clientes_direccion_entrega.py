from django.db import migrations

# DEV-136: el alta de cliente suma la dirección de entrega opcional. Se agregan sus pasos después
# de la Localidad de facturación; los de los campos son opcionales: con el interruptor en No no
# aparecen y el tutorial los saltea.

TUTORIAL_KEY = 'clients'
# Orden del paso 'client-district' en 0002_tutoriales_iniciales: los nuevos van a continuación.
INSERT_AFTER = 6
NEW_STEPS = [
    {
        'elemento': 'client-delivery-toggle', 'titulo': '¿Se entrega en otra dirección?',
        'descripcion': 'Si la mercadería se le entrega en un lugar distinto a la dirección de facturación, activá el interruptor y cargá la dirección de entrega. Si no, dejalo en No. Después tocá Siguiente.',
        'avance': 'next',
    },
    {
        'elemento': 'client-delivery-province', 'titulo': 'Provincia de entrega', 'descripcion': 'Elegí la provincia donde se entrega.',
        'avance': 'check', 'condicion': 'filled', 'opcional': True,
    },
    {
        'elemento': 'client-delivery-city', 'titulo': 'Municipio de entrega', 'descripcion': 'Elegí el municipio. La lista se carga según la provincia.',
        'avance': 'check', 'condicion': 'filled', 'opcional': True,
    },
    {
        'elemento': 'client-delivery-district', 'titulo': 'Localidad de entrega', 'descripcion': 'Elegí la localidad.',
        'avance': 'check', 'condicion': 'filled', 'opcional': True,
    },
    {
        'elemento': 'client-delivery-address', 'titulo': 'Dirección de entrega', 'descripcion': 'Escribí la calle y el número donde se entrega. Después tocá Continuar.',
        'avance': 'check', 'condicion': 'filled', 'confirmar': True, 'opcional': True,
    },
]
ROUTE = '/client/create'


def shift_steps(TutorialPaso, tutorial, after, offset):
    # Uno por uno y en el orden que no repite (tutorial, orden) en ningún momento.
    steps = TutorialPaso.objects.filter(tutorial=tutorial, orden__gt=after)
    for step in steps.order_by('-orden' if offset > 0 else 'orden'):
        step.orden += offset
        step.save(update_fields=['orden'])


def add_delivery_steps(apps, schema_editor):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    tutorial = Tutorial.objects.filter(clave=TUTORIAL_KEY).first()
    if not tutorial:
        return
    shift_steps(TutorialPaso, tutorial, INSERT_AFTER, len(NEW_STEPS))
    TutorialPaso.objects.bulk_create([
        TutorialPaso(tutorial=tutorial, orden=INSERT_AFTER + index, ruta=ROUTE, **step_data)
        for index, step_data in enumerate(NEW_STEPS, start=1)
    ])


def remove_delivery_steps(apps, schema_editor):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    tutorial = Tutorial.objects.filter(clave=TUTORIAL_KEY).first()
    if not tutorial:
        return
    TutorialPaso.objects.filter(tutorial=tutorial, elemento__in=[step['elemento'] for step in NEW_STEPS]).delete()
    shift_steps(TutorialPaso, tutorial, INSERT_AFTER + len(NEW_STEPS), -len(NEW_STEPS))


class Migration(migrations.Migration):

    dependencies = [
        ('tutorial', '0002_tutoriales_iniciales'),
    ]

    operations = [
        migrations.RunPython(add_delivery_steps, remove_delivery_steps),
    ]
