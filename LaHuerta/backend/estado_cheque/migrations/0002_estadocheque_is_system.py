from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estado_cheque', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='estadocheque',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
