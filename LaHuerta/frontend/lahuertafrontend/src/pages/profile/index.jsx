import React, { useRef, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Avatar from '@mui/material/Avatar';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import LockIcon from '@mui/icons-material/LockOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCameraOutlined';
import CustomInput from '../../components/Input';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import BasicDatePicker from '../../components/DatePicker';
import PasswordRequirements from '../../components/PasswordRequirements';
import PasswordMatchHint from '../../components/PasswordMatchHint';
import AvatarCropModal from '../../components/AvatarCropModal';
import { authMeUrl, authMeAvatarUrl, authPasswordChangeUrl } from '../../constants/urls';
import { useCsrfToken } from '../../hooks/useCsrfToken';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIG } from '../../constants/roles';
import { formatDate } from '../../utils/date';

// ── Utilidades ───────────────────────────────────────────────────────────────

const formatTelefono = (raw = '') => {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

const extractErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const fieldErrors = Object.values(data).flat().filter((v) => typeof v === 'string');
  return fieldErrors[0] || fallback;
};

const extractFieldErrors = (error) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return {};
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail') continue;
    if (Array.isArray(value) && value.length) result[key] = value[0];
  }
  return result;
};

// ── Estilos reutilizables (mismos tokens que ClientForm) ──────────────────────

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const SectionCard = ({ icon, title, children, cols = 2 }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
    </div>
    <div className={`bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
      {children}
    </div>
  </section>
);

const ReadOnlyField = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <label className={labelCls}>{label}</label>
    <p className="w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted cursor-not-allowed">
      {value || '—'}
    </p>
  </div>
);

const RoleBadge = ({ role }) => {
  const config = ROLE_CONFIG[role] || {};
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>Rol</label>
      <div className="py-2.5">
        <span
          className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: config.bg || '#f0f4f7', color: config.color || '#596064' }}
        >
          {config.label || role}
        </span>
      </div>
    </div>
  );
};

const FieldError = ({ error, touched }) =>
  touched && error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null;

const SuccessBanner = ({ message }) =>
  message ? (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <p className="text-green-800 text-sm">{message}</p>
    </div>
  ) : null;

// ── Componente principal ──────────────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate();
  const csrfToken = useCsrfToken();
  const { user, setUser } = useAuth();

  // -- Datos personales --
  const [personalToast, setPersonalToast] = useState({ open: false, message: '' });
  const [personalSuccess, setPersonalSuccess] = useState('');

  const personalInitialValues = {
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    birth_date: user?.birth_date || null,
    address: user?.address || '',
    phone: user?.phone || '',
  };

  const personalValidationSchema = Yup.object({
    first_name: Yup.string().max(150, 'Máximo 150 caracteres'),
    last_name: Yup.string().max(150, 'Máximo 150 caracteres'),
    birth_date: Yup.string().nullable(),
    address: Yup.string().max(255, 'Máximo 255 caracteres'),
    phone: Yup.string().max(30, 'Máximo 30 caracteres'),
  });

  const handlePersonalSubmit = async (values, { setFieldError, setFieldTouched }) => {
    setPersonalSuccess('');
    try {
      const response = await axios.patch(
        authMeUrl,
        {
          first_name: values.first_name,
          last_name: values.last_name,
          birth_date: values.birth_date || null,
          address: values.address,
          phone: values.phone,
        },
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } }
      );
      setUser(response.data);
      setPersonalSuccess('Datos personales actualizados correctamente.');
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setFieldError(field, message);
        setFieldTouched(field, true, false);
      });
      setPersonalToast({ open: true, message: extractErrorMessage(error, 'Error al guardar los datos personales.') });
    }
  };

  // -- Cambio de contraseña --
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [passwordToast, setPasswordToast] = useState({ open: false, message: '' });
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordFieldErrors[name]) {
      setPasswordFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordFieldErrors({});
    setPasswordLoading(true);
    try {
      await axios.post(authPasswordChangeUrl, passwordData, {
        withCredentials: true,
        headers: { 'X-CSRFToken': csrfToken },
      });
      setPasswordData({ old_password: '', new_password: '', new_password_confirm: '' });
      setPasswordSuccess('Contraseña actualizada correctamente.');
    } catch (error) {
      setPasswordFieldErrors(extractFieldErrors(error));
      setPasswordToast({ open: true, message: extractErrorMessage(error, 'Error al cambiar la contraseña.') });
    } finally {
      setPasswordLoading(false);
    }
  };

  // -- Foto de perfil --
  const fileInputRef = useRef(null);
  const [cropModal, setCropModal] = useState({ open: false, imageSrc: null });
  const [avatarToast, setAvatarToast] = useState({ open: false, message: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarToast({ open: true, message: 'El archivo seleccionado no es una imagen.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropModal({ open: true, imageSrc: reader.result });
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (blob) => {
    setCropModal({ open: false, imageSrc: null });
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const response = await axios.post(authMeAvatarUrl, formData, {
        withCredentials: true,
        headers: { 'X-CSRFToken': csrfToken, 'Content-Type': 'multipart/form-data' },
      });
      setUser(response.data);
    } catch (error) {
      setAvatarToast({ open: true, message: extractErrorMessage(error, 'Error al subir la foto de perfil.') });
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">Mi Perfil</span>
      </nav>

      {/* Foto de perfil */}
      <SectionCard icon={<PhotoCameraIcon sx={{ fontSize: 20 }} />} title="Foto de Perfil" cols={1}>
        <Toast open={avatarToast.open} message={avatarToast.message} onClose={() => setAvatarToast({ open: false, message: '' })} />
        <div className="flex items-center gap-6">
          <Avatar src={user.avatar || undefined} sx={{ width: 96, height: 96, fontSize: '2rem', bgcolor: '#4a7bc4' }}>
            {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
          </Avatar>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileSelected}
            />
            <Button
              type="button"
              label={avatarUploading ? 'Subiendo...' : 'Cambiar foto'}
              color="primary"
              variant="contained"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
            />
            <p className="text-xs text-on-surface-muted">Podés recortarla antes de guardarla.</p>
          </div>
        </div>
        <AvatarCropModal
          open={cropModal.open}
          imageSrc={cropModal.imageSrc}
          onClose={() => setCropModal({ open: false, imageSrc: null })}
          onConfirm={handleCropConfirm}
        />
      </SectionCard>

      {/* Datos de la cuenta (solo lectura) */}
      <SectionCard icon={<BadgeIcon sx={{ fontSize: 20 }} />} title="Datos de la Cuenta">
        <ReadOnlyField label="Email" value={user.email} />
        <ReadOnlyField label="Nombre de usuario" value={user.username} />
        <RoleBadge role={user.role} />
        <ReadOnlyField label="Miembro desde" value={user.date_joined ? formatDate(user.date_joined) : ''} />
      </SectionCard>

      {/* Datos personales */}
      <Formik
        initialValues={personalInitialValues}
        validationSchema={personalValidationSchema}
        enableReinitialize
        onSubmit={handlePersonalSubmit}
      >
        {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => (
          <Form>
            <Toast open={personalToast.open} message={personalToast.message} onClose={() => setPersonalToast({ open: false, message: '' })} />
            <SectionCard icon={<PersonIcon sx={{ fontSize: 20 }} />} title="Datos Personales">
              <div className="md:col-span-2">
                <SuccessBanner message={personalSuccess} />
              </div>
              <div className="flex flex-col gap-1">
                <CustomInput
                  name="first_name"
                  label="Nombre"
                  value={values.first_name}
                  onChange={handleChange}
                  helperText={touched.first_name ? errors.first_name : ''}
                />
              </div>
              <div className="flex flex-col gap-1">
                <CustomInput
                  name="last_name"
                  label="Apellido"
                  value={values.last_name}
                  onChange={handleChange}
                  helperText={touched.last_name ? errors.last_name : ''}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Fecha de nacimiento</label>
                <BasicDatePicker
                  value={values.birth_date}
                  onChange={(date) => setFieldValue('birth_date', date)}
                  hasError={touched.birth_date && Boolean(errors.birth_date)}
                />
                <FieldError error={errors.birth_date} touched={touched.birth_date} />
              </div>
              <div className="flex flex-col gap-1">
                <CustomInput
                  name="phone"
                  label="Teléfono"
                  type="tel"
                  value={formatTelefono(values.phone)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFieldValue('phone', raw);
                  }}
                  placeholder="11-XXXX-XXXX"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <CustomInput
                  name="address"
                  label="Domicilio"
                  value={values.address}
                  onChange={handleChange}
                  helperText={touched.address ? errors.address : ''}
                />
              </div>
              <div className="md:col-span-2 flex justify-center sm:justify-end">
                <Button
                  type="submit"
                  label={isSubmitting ? 'Guardando...' : 'Guardar datos personales'}
                  color="primary"
                  variant="contained"
                  disabled={isSubmitting}
                />
              </div>
            </SectionCard>
          </Form>
        )}
      </Formik>

      {/* Cambiar contraseña */}
      <form onSubmit={handlePasswordSubmit}>
        <Toast open={passwordToast.open} message={passwordToast.message} onClose={() => setPasswordToast({ open: false, message: '' })} />
        <SectionCard icon={<LockIcon sx={{ fontSize: 20 }} />} title="Cambiar Contraseña">
          <div className="md:col-span-2">
            <SuccessBanner message={passwordSuccess} />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <CustomInput
              name="old_password"
              label="Contraseña actual"
              type="password"
              value={passwordData.old_password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              helperText={passwordFieldErrors.old_password || ''}
            />
          </div>
          <div className="flex flex-col gap-1">
            <CustomInput
              name="new_password"
              label="Nueva contraseña"
              type="password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              helperText={passwordFieldErrors.new_password || ''}
            />
            <PasswordRequirements value={passwordData.new_password} />
          </div>
          <div className="flex flex-col gap-1">
            <CustomInput
              name="new_password_confirm"
              label="Confirmar nueva contraseña"
              type="password"
              value={passwordData.new_password_confirm}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              helperText={passwordFieldErrors.new_password_confirm || ''}
            />
            <PasswordMatchHint password={passwordData.new_password} confirmValue={passwordData.new_password_confirm} />
          </div>
          <div className="md:col-span-2 flex justify-center sm:justify-end">
            <Button
              type="submit"
              label={passwordLoading ? 'Guardando...' : 'Cambiar contraseña'}
              color="primary"
              variant="contained"
              disabled={
                passwordLoading ||
                !passwordData.old_password ||
                !passwordData.new_password ||
                !passwordData.new_password_confirm
              }
            />
          </div>
        </SectionCard>
      </form>
    </div>
  );
};

export default Profile;
