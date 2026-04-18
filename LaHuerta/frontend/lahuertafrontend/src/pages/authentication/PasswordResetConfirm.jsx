import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import CustomInput from '../../components/Input';
import Button from '../../components/Button';
import AuthMarketingPanel from '../../components/AuthMarketingPanel';
import { authPasswordResetConfirmUrl } from '../../constants/urls';
import { useCsrfToken } from '../../hooks/useCsrfToken';

const PasswordResetConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const csrfToken = useCsrfToken();
  const [formData, setFormData] = useState({
    new_password: '',
    new_password_confirm: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');

  // Obtener uid y token de los query params
  useEffect(() => {
    const uidParam = searchParams.get('uid');
    const tokenParam = searchParams.get('token');
    
    if (!uidParam || !tokenParam) {
      setError('Enlace inválido. Por favor, solicita un nuevo código de recuperación.');
    } else {
      setUid(uidParam);
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    if (!uid || !token) {
      setError('Enlace inválido. Por favor, solicita un nuevo código de recuperación.');
      setLoading(false);
      return;
    }

    try {
      await axios.post(
        authPasswordResetConfirmUrl,
        {
          uid: uid,
          token: token,
          new_password: formData.new_password,
          new_password_confirm: formData.new_password_confirm,
        },
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': csrfToken,
          },
        }
      );

      navigate('/login');
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data;
        
        // Manejar errores de validación por campo
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
          setError('Error al restablecer la contraseña. Intente nuevamente.');
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
        titleLine1="Nueva"
        titleLine2="contraseña 🔑"
        description="Creá una nueva contraseña segura para tu cuenta. Asegurate de que tenga al menos 8 caracteres, una mayúscula, un número y un carácter especial."
      />

      {/* Panel derecho - formulario */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Restablecer contraseña</h1>
          <p className="text-sm text-gray-500 mb-6">
            Ingresá tu nueva contraseña. Asegurate de que sea segura y fácil de recordar.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <CustomInput
                name="new_password"
                label="Nueva contraseña"
                type="password"
                value={formData.new_password}
                onChange={handleChange}
                required
                helperText={fieldErrors.new_password ? (Array.isArray(fieldErrors.new_password) ? fieldErrors.new_password[0] : fieldErrors.new_password) : 'Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial'}
              />
            </div>

            <div>
              <CustomInput
                name="new_password_confirm"
                label="Confirmar nueva contraseña"
                type="password"
                value={formData.new_password_confirm}
                onChange={handleChange}
                required
                helperText={fieldErrors.new_password_confirm ? (Array.isArray(fieldErrors.new_password_confirm) ? fieldErrors.new_password_confirm[0] : fieldErrors.new_password_confirm) : ''}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm mt-2">
                {error}
              </div>
            )}

            <div className="mt-6">
              <Button
                label={loading ? 'Restableciendo...' : 'Restablecer contraseña'}
                color="primary"
                variant="contained"
                size="large"
                disabled={loading || !formData.new_password || !formData.new_password_confirm || !uid || !token}
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
        </div>
      </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirm;

