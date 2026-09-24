from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cheque', '0002_update_cheque_model'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cheque',
            name='numero',
            field=models.IntegerField(),
        ),
        migrations.AddField(
            model_name='cheque',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
