import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CustomInput from '../../components/Input';
import Button from '../../components/Button';
import AuthMarketingPanel from '../../components/AuthMarketingPanel';
import { authLoginUrl, authVerifyEmailUrl, authResendVerificationCodeUrl } from '../../constants/urls';
import { useCsrfToken } from '../../hooks/useCsrfToken';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const csrfToken = useCsrfToken();
  const from = location.state?.from?.pathname || '/';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (emailNotVerified) {
      setEmailNotVerified(false);
      setVerificationCode('');
      setVerificationError('');
      setResendSuccess(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setEmailNotVerified(false);

    try {
      await axios.post(
        authLoginUrl,
        {
          email: formData.email,
          password: formData.password,
        },
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': csrfToken,
          },
        }
      );

      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.status === 403 && err.response.data?.code === 'email_not_verified') {
        setEmailNotVerified(true);
      } else if (err.response && err.response.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          setError(data);
        } else if (data.non_field_errors && data.non_field_errors.length > 0) {
          setError(data.non_field_errors[0]);
        } else if (data.detail) {
          setError(data.detail);
        } else {
          setError('Error al iniciar sesión. Intente nuevamente.');
        }
      } else {
        setError('Error de conexión. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setVerificationError('');
    setResendSuccess(false);
    try {
      await axios.post(
        authResendVerificationCodeUrl,
        { email: formData.email },
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } }
      );
      setResendSuccess(true);
      setVerificationCode('');
    } catch (err) {
      setVerificationError(err.response?.data?.detail || 'No se pudo reenviar el código.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setVerificationError('');
    try {
      await axios.post(
        authVerifyEmailUrl,
        { email: formData.email, code: verificationCode },
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } }
      );
      navigate(from, { replace: true });
    } catch (err) {
      setVerificationError(err.response?.data?.detail || 'Código inválido o expirado. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-lahuerta to-little-blue-lahuerta p-4">
      <div className="w-full max-w-6xl flex min-h-[600px] bg-white rounded-xl shadow-xl overflow-hidden">
      <AuthMarketingPanel
        titleLine1="Bienvenido a"
        titleLine2="La Huerta 👋"
        description="Gestioná clientes, productos y operaciones del negocio de forma simple. Automatizá tareas repetitivas y ganá tiempo para lo importante."
      />

      {/* Panel derecho */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Iniciar sesión</h1>
          <p className="text-sm text-gray-500 mb-6">
            Ingresá tus credenciales para acceder al panel de La Huerta.
          </p>

          {emailNotVerified ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  Tu cuenta aún no fue verificada. Revisá tu email <strong>{formData.email}</strong> o reenviá el código.
                </p>
              </div>

              {resendSuccess && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    Te enviamos un nuevo código a <strong>{formData.email}</strong>. Ingresalo abajo.
                  </p>
                </div>
              )}

              {resendSuccess && (
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
                  <Button
                    type="submit"
                    label={loading ? 'Verificando...' : 'Verificar y entrar'}
                    color="primary"
                    variant="contained"
                    size="large"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full !justify-center"
                  />
                </form>
              )}

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm hover:underline disabled:opacity-50"
                  style={{ color: '#4a7bc4', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={handleResendCode}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Enviando...' : 'Reenviar código'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:underline"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => { setEmailNotVerified(false); setVerificationCode(''); setResendSuccess(false); }}
                >
                  Volver al login
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <CustomInput
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />

            <CustomInput
              name="password"
              label="Contraseña"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              showToggle
              autoComplete="current-password"
            />

            {error && (
              <div className="text-red-600 text-sm mt-2">
                {error}
              </div>
            )}

            <div className="mt-6">
              <Button
                label={loading ? 'Ingresando...' : 'Ingresar'}
                color="primary"
                variant="contained"
                size="large"
                type="submit"
                disabled={loading || !formData.email || !formData.password}
                className="w-full !justify-center"
              />
            </div>

            {/* Botón futuro para Google */}
            <div className="mt-4">
              <button
                type="button"
                disabled
                className="w-full border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 flex items-center justify-center gap-2 cursor-not-allowed bg-gray-100"
              >
                <span className="text-gray-400">Login con Google (próximamente)</span>
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center space-y-2">
              <button
                type="button"
                className="text-sm hover:underline"
                style={{ color: '#4a7bc4', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => navigate('/password-reset')}
              >
                ¿Olvidaste tu contraseña?
              </button>

              <button
                type="button"
                className="text-sm hover:underline"
                style={{ color: '#4a7bc4', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => navigate('/register')}
              >
                ¿Sos nuevo? Registrate
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

export default Login;


