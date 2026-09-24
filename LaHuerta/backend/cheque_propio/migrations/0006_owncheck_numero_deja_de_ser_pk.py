from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cheque_propio', '0005_owncheck_fecha_deposito'),
    ]

    operations = [
        migrations.AlterField(
            model_name='owncheck',
            name='numero',
            field=models.IntegerField(),
        ),
        migrations.AddField(
            model_name='owncheck',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
        migrations.AddConstraint(
            model_name='owncheck',
            constraint=models.UniqueConstraint(fields=['numero', 'banco'], name='unique_own_check_numero_banco'),
        ),
    ]
