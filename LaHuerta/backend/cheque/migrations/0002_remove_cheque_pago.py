from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cheque', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='cheque',
            name='pago',
        ),
    ]
