import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CustomInput from '../../components/Input';
import Button from '../../components/Button';
import AuthMarketingPanel from '../../components/AuthMarketingPanel';
import { authPasswordResetUrl } from '../../constants/urls';
import { useCsrfToken } from '../../hooks/useCsrfToken';

const PasswordResetRequest = () => {
  const navigate = useNavigate();
  const csrfToken = useCsrfToken();
  const [formData, setFormData] = useState({
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.post(
        authPasswordResetUrl,
        {
          email: formData.email,
        },
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': csrfToken,
          },
        }
      );

      setSuccess(true);
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.email && Array.isArray(data.email)) {
          setError(data.email[0]);
        } else if (data.detail) {
          setError(data.detail);
        } else {
          setError('Error al solicitar recuperación de contraseña. Intente nuevamente.');
        }
      } else {
        setError('Error de conexión. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-lahuerta to-little-blue-lahuerta p-4">
      <div className="w-full max-w-6xl flex min-h-[600px] bg-white rounded-xl shadow-xl overflow-hidden">
      <AuthMarketingPanel
        titleLine1="Recuperá tu"
        titleLine2="contraseña 🔐"
        description="No te preocupes, te ayudamos a recuperar el acceso a tu cuenta. Ingresá tu email y te enviaremos las instrucciones."
      />

      {/* Panel derecho - formulario */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500 mb-6">
            Ingresá tu email y te enviaremos un código para restablecer tu contraseña.
          </p>

          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  Si el email existe, se ha enviado un código de recuperación a tu correo electrónico.
                  Revisá tu bandeja de entrada y seguí las instrucciones.
                </p>
              </div>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="text-sm text-blue-lahuerta hover:underline"
                  onClick={() => navigate('/login')}
                >
                  Volver al inicio de sesión
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
              />

              {error && (
                <div className="text-red-600 text-sm mt-2">
                  {error}
                </div>
              )}

              <div className="mt-6">
                <Button
                  label={loading ? 'Enviando...' : 'Enviar código'}
                  color="primary"
                  variant="contained"
                  size="large"
                  disabled={loading || !formData.email}
                  className="w-full !justify-center"
                />
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="text-sm text-blue-lahuerta hover:underline"
                  onClick={() => navigate('/login')}
                >
                  Volver al inicio de sesión
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

export default PasswordResetRequest;

