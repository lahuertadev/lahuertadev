import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CustomInput from '../../components/Input';
import BasicSelect from '../../components/Select';
import Button from '../../components/Button';
import AuthMarketingPanel from '../../components/AuthMarketingPanel';
import { authRegisterUrl, authVerifyEmailUrl, authResendVerificationCodeUrl } from '../../constants/urls';
import { useCsrfToken } from '../../hooks/useCsrfToken';

const Register = () => {
  const navigate = useNavigate();
  const csrfToken = useCsrfToken();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    role: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  // Paso después del registro: 'register' | 'verify' | 'done'
  const [step, setStep] = useState('register');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  // Opciones de roles
  const roleOptions = [
    { value: 'employee', name: 'Empleado' },
    { value: 'administrator', name: 'Administración' },
    { value: 'superuser', name: 'Superusuario' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    const selectedValue = value?.value || value || '';
    setFormData((prev) => ({ ...prev, [name]: selectedValue }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    setSuccess(false);

    try {
      await axios.post(
        authRegisterUrl,
        {
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
          password_confirm: formData.password_confirm,
          role: formData.role,
        },
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': csrfToken,
          },
        }
      );

      // Pasar al paso de verificación de email (mantener formulario oculto, mostrar input de código)
      setStep('verify');
      setError('');
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data;
      
        if (typeof data === 'object' && !data.detail && !data.message) {
          setFieldErrors(data);
          const firstError = Object.values(data)[0];
          if (Array.isArray(firstError)) {
            setError(firstError[0]);
          } else if (typeof firstError === 'string') {
            setError(firstError);
          }
        } else if (data.detail) {
          setError(data.detail);
        } else if (data.message) {
          setError(data.message);
        } else {
          setError('Error al registrar el usuario. Intente nuevamente.');
        }
      } else {
        setError('Error de conexión. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerificationError('');
    setLoading(true);
    try {
      await axios.post(
        authVerifyEmailUrl,
        { email: formData.email, code: verificationCode },
        {
          withCredentials: true,
          headers: { 'X-CSRFToken': csrfToken },
        }
      );
      setStep('done');
      setSuccess(true);
      setVerificationCode('');
    } catch (err) {
      if (err.response?.data?.detail) {
        setVerificationError(err.response.data.detail);
      } else {
        setVerificationError('Error al verificar el código. Intentá de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setVerificationError('');
    setResendLoading(true);
    try {
      await axios.post(
        authResendVerificationCodeUrl,
        { email: formData.email },
        {
          withCredentials: true,
          headers: { 'X-CSRFToken': csrfToken },
        }
      );
      setVerificationCode('');
      setVerificationError('');
    } catch (err) {
      setVerificationError(err.response?.data?.detail || 'No se pudo reenviar el código.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-lahuerta to-little-blue-lahuerta p-4">
      <div className="w-full max-w-6xl flex min-h-[600px] bg-white rounded-xl shadow-xl overflow-hidden">
      <AuthMarketingPanel
        titleLine1="Únete a"
        titleLine2="La Huerta 👋"
        description="Creá tu cuenta y comenzá a gestionar tu negocio de forma eficiente. Registrate en menos de un minuto y empezá a trabajar."
      />

      {/* Panel derecho - formulario de registro */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Crear cuenta</h1>
          <p className="text-sm text-gray-500 mb-6">
            Completá el formulario para registrarte en La Huerta.
          </p>

          {step === 'done' && success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  ¡Email verificado! Tu cuenta está activa. Ya podés iniciar sesión con tus credenciales.
                </p>
              </div>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="text-sm text-blue-lahuerta hover:underline"
                  onClick={() => navigate('/login')}
                >
                  Ir al inicio de sesión
                </button>
              </div>
            </div>
          ) : step === 'verify' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm">
                  Te enviamos un código de 6 dígitos a <strong>{formData.email}</strong>. Ingresalo abajo para verificar tu cuenta.
                </p>
              </div>
              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <CustomInput
                  name="verificationCode"
                  label="Código de verificación"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(v);
                    setVerificationError('');
                  }}
                  placeholder="123456"
                  maxLength={6}
                  helperText={verificationError || 'Ingresá el código de 6 dígitos que recibiste por email'}
                  error={!!verificationError}
                />
                <div className="mt-6">
                  <Button
                    type="submit"
                    label={loading ? 'Verificando...' : 'Verificar email'}
                    color="primary"
                    variant="contained"
                    size="large"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full !justify-center"
                  />
                </div>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="text-sm text-blue-lahuerta hover:underline disabled:opacity-50"
                  onClick={handleResendCode}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Enviando...' : 'Reenviar código'}
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <CustomInput
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                helperText={fieldErrors.email ? (Array.isArray(fieldErrors.email) ? fieldErrors.email[0] : fieldErrors.email) : ''}
              />
            </div>

            {/* Username */}
            <div>
              <CustomInput
                name="username"
                label="Nombre de usuario"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                helperText={fieldErrors.username ? (Array.isArray(fieldErrors.username) ? fieldErrors.username[0] : fieldErrors.username) : ''}
              />
            </div>

            {/* First Name */}
            <div>
              <CustomInput
                name="first_name"
                label="Nombre"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                helperText={fieldErrors.first_name ? (Array.isArray(fieldErrors.first_name) ? fieldErrors.first_name[0] : fieldErrors.first_name) : ''}
              />
            </div>

            {/* Last Name */}
            <div>
              <CustomInput
                name="last_name"
                label="Apellido"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                helperText={fieldErrors.last_name ? (Array.isArray(fieldErrors.last_name) ? fieldErrors.last_name[0] : fieldErrors.last_name) : ''}
              />
            </div>

            {/* Role */}
            <div>
              <BasicSelect
                name="role"
                label="Rol"
                value={formData.role ? { value: formData.role, name: roleOptions.find(r => r.value === formData.role)?.name || '' } : { value: '', name: '' }}
                onChange={handleSelectChange}
                options={roleOptions}
              />
              {fieldErrors.role && (
                <p className="text-red-600 text-xs mt-1">
                  {Array.isArray(fieldErrors.role) ? fieldErrors.role[0] : fieldErrors.role}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <CustomInput
                name="password"
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                helperText={fieldErrors.password ? (Array.isArray(fieldErrors.password) ? fieldErrors.password[0] : fieldErrors.password) : 'Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial'}
              />
            </div>

            {/* Password Confirm */}
            <div>
              <CustomInput
                name="password_confirm"
                label="Confirmar contraseña"
                type="password"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                helperText={fieldErrors.password_confirm ? (Array.isArray(fieldErrors.password_confirm) ? fieldErrors.password_confirm[0] : fieldErrors.password_confirm) : ''}
              />
            </div>

            {/* Error general */}
            {error && (
              <div className="text-red-600 text-sm mt-2">
                {error}
              </div>
            )}

            <div className="mt-6">
              <Button
                label={loading ? 'Registrando...' : 'Registrarse'}
                color="primary"
                variant="contained"
                size="large"
                disabled={loading || !csrfToken || !formData.email || !formData.username || !formData.password || !formData.password_confirm || !formData.role}
                className="w-full !justify-center"
              />
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-blue-lahuerta hover:underline"
                onClick={() => navigate('/login')}
              >
                ¿Ya tenés cuenta? Iniciar sesión
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Register;

