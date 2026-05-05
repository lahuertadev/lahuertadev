from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('categoria', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='categoria',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
