# Generated manually for email verification fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('autenticacion', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='email_verified',
            field=models.BooleanField(default=False, verbose_name='Email verificado'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='email_verification_code',
            field=models.CharField(blank=True, max_length=6, null=True, verbose_name='Código de verificación'),
        ),
        migrations.AddField(
            model_name='usuario',
            name='email_verification_code_expires',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Expiración del código'),
        ),
    ]
