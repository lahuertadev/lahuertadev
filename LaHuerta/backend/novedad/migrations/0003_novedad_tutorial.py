import django.db.models.deletion
from django.db import migrations, models


def copy_tutorial_keys(apps, schema_editor):
    '''Pasa la clave de texto (tutorial_clave) a la relación con el tutorial, si existe.'''
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    for news in Novedad.objects.exclude(tutorial_clave__isnull=True).exclude(tutorial_clave=''):
        news.tutorial = Tutorial.objects.filter(clave=news.tutorial_clave).first()
        news.save(update_fields=['tutorial'])


def copy_tutorial_ids(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    for news in Novedad.objects.filter(tutorial__isnull=False).select_related('tutorial'):
        news.tutorial_clave = news.tutorial.clave
        news.save(update_fields=['tutorial_clave'])


class Migration(migrations.Migration):
    '''
    La novedad ofrece un tutorial guiado: pasa de guardar la clave como texto a una relación con
    la tabla tutorial (DEV-138), para que no pueda apuntar a un tutorial inexistente.
    '''

    dependencies = [
        ('novedad', '0002_novedades_iniciales'),
        ('tutorial', '0002_tutoriales_iniciales'),
    ]

    operations = [
        migrations.AddField(
            model_name='novedad',
            name='tutorial',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='novedades',
                to='tutorial.tutorial', help_text='Tutorial guiado que se ofrece desde el aviso ("Ver tutorial").',
            ),
        ),
        migrations.RunPython(copy_tutorial_keys, copy_tutorial_ids),
        migrations.RemoveField(
            model_name='novedad',
            name='tutorial_clave',
        ),
    ]
