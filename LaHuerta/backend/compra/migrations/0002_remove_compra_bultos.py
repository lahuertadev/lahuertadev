from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('compra', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='compra',
            name='bultos',
        ),
    ]
