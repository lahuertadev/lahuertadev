import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CustomInput from '../../components/Input';
import Button from '../../components/Button';
import AuthMarketingPanel from '../../components/AuthMarketingPanel';
import { authLoginUrl } from '../../constants/urls';
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
      if (err.response && err.response.data) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-lahuerta to-little-blue-lahuerta p-4">
      <div className="w-full max-w-6xl flex min-h-[600px] bg-white rounded-xl shadow-xl overflow-hidden">
      <AuthMarketingPanel
        titleLine1="Bienvenido a"
        titleLine2="La Huerta 👋"
        description="Gestioná clientes, productos y operaciones del negocio de forma simple. Automatizá tareas repetitivas y ganá tiempo para lo importante."
      />

      {/* Panel derecho - formulario de login */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Iniciar sesión</h1>
          <p className="text-sm text-gray-500 mb-6">
            Ingresá tus credenciales para acceder al panel de La Huerta.
          </p>

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
                className="text-sm text-blue-lahuerta hover:underline"
                onClick={() => navigate('/password-reset')}
              >
                ¿Olvidaste tu contraseña?
              </button>

              <button
                type="button"
                className="text-sm text-blue-lahuerta hover:underline"
                onClick={() => navigate('/register')}
              >
                ¿Sos nuevo? Registrate
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;


