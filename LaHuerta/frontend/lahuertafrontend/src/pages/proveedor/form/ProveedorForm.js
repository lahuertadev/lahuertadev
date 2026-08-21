import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadOptions } from '../../../utils/selectOptions';
import { supplierUrl, marketUrl } from '../../../constants/urls';
import Toast from '../../../components/Toast';
import AmountInput from '../../../components/AmountInput';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

// ── Utilidades ───────────────────────────────────────────────────────────────

const formatTelefono = (raw = '') => {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

const BACKEND_TO_FORM_FIELD = {
  nombre: 'nombre',
  nombre_fantasia: 'fantasyName',
  mercado: 'market',
  puesto: 'puesto',
  nave: 'nave',
  telefono: 'telefono',
  cuenta_corriente: 'checkingAccount',
};

const extractErrorMessage = (error) => {
  const data = error?.response?.data;
  if (!data) return 'Error al guardar. Verificá los datos e intentá de nuevo.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const fieldErrors = Object.values(data).flat().filter((v) => typeof v === 'string');
  if (fieldErrors.length) return fieldErrors[0];
  return 'Error al guardar. Verificá los datos e intentá de nuevo.';
};

const extractFieldErrors = (error) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return {};
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail' || key === 'error') continue;
    const formField = BACKEND_TO_FORM_FIELD[key];
    if (formField && Array.isArray(value) && value.length) {
      result[formField] = value[0];
    }
  }
  return result;
};

// ── Estilos reutilizables ─────────────────────────────────────────────────────
const inputCls = (hasError, isLocked = false) =>
  isLocked
    ? 'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted cursor-not-allowed'
    : `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
        hasError
          ? 'border-red-400 ring-2 ring-red-100'
          : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
      }`;

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const SectionCard = ({ icon, title, children, cols = 3 }) => (
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

const FieldError = ({ error, touched }) =>
  touched && error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null;

// ── Componente principal ──────────────────────────────────────────────────────
const ProveedorForm = () => {
  const [markets, setMarkets] = useState([]);
  const [initialValues, setInitialValues] = useState({
    nombre: '',
    fantasyName: '',
    market: null,
    puesto: '',
    nave: '',
    telefono: '',
    checkingAccount: '',
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, message: '' });

  const loadInitialOptions = async () => {
    const marketOptions = await loadOptions(marketUrl, (data) =>
      data.map((item) => ({ name: item.descripcion, value: item.id }))
    );
    setMarkets(marketOptions);
  };

  const fetchItemToEdit = async () => {
    try {
      const response = await axios.get(`${supplierUrl}${id}/`);
      const data = response.data;

      setInitialValues({
        nombre: data.nombre,
        fantasyName: data.nombre_fantasia,
        market: { name: data.mercado.descripcion, value: data.mercado.id },
        puesto: data.puesto,
        nave: data.nave,
        telefono: data.telefono,
        checkingAccount: data.cuenta_corriente,
      });
    } catch (error) {
      console.error('Error al cargar el proveedor para la edición: ', error);
    }
  };

  const validationSchema = Yup.object({
    nombre: Yup.string().required('El nombre es obligatorio'),
    market: Yup.object().nullable().required('El mercado es obligatorio'),
    puesto: Yup.number().required('El puesto es obligatorio').positive().integer(),
    nave: Yup.number().nullable().positive().integer(),
    telefono: Yup.string().required('El teléfono es obligatorio'),
  });

  const mapFormDataToBackend = (values) => ({
    nombre: values.nombre,
    nombre_fantasia: values.fantasyName,
    mercado: values.market?.value,
    puesto: values.puesto,
    nave: values.nave === '' ? null : values.nave,
    telefono: values.telefono,
    cuenta_corriente: values.checkingAccount !== '' ? values.checkingAccount : '0',
  });

  const handleSubmit = async (values, { setFieldError, setFieldTouched }) => {
    try {
      const mappedValues = mapFormDataToBackend(values);
      if (id) {
        await axios.put(`${supplierUrl}${id}/`, mappedValues);
      } else {
        await axios.post(supplierUrl, mappedValues);
      }
      navigate('/supplier');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
      const fieldErrors = extractFieldErrors(error);
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setFieldError(field, message);
        setFieldTouched(field, true, false);
      });
      setToast({ open: true, message: extractErrorMessage(error) });
    }
  };

  useEffect(() => {
    const loadFormOptions = async () => {
      await loadInitialOptions();
      if (id) {
        await fetchItemToEdit();
      }
    };
    loadFormOptions();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, handleChange, setFieldValue }) => (
        <Form className="w-full max-w-5xl mx-auto space-y-8 pb-12">
          <Toast
            open={toast.open}
            message={toast.message}
            onClose={() => setToast({ open: false, message: '' })}
          />

          {/* Breadcrumbs */}
          <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
            <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
            <span className="text-xs">›</span>
            <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/supplier')}>Proveedores</span>
            <span className="text-xs">›</span>
            <span className="text-on-surface font-semibold">{id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</span>
          </nav>

          {/* 1. Datos del Proveedor */}
          <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Datos del Proveedor">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Nombre</label>
              <input
                name="nombre"
                value={values.nombre}
                onChange={handleChange}
                placeholder="Nombre del proveedor"
                className={inputCls(touched.nombre && errors.nombre)}
              />
              <FieldError error={errors.nombre} touched={touched.nombre} />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className={labelCls}>Nombre Fantasía</label>
              <input
                name="fantasyName"
                value={values.fantasyName}
                onChange={handleChange}
                placeholder="Nombre comercial"
                className={inputCls(false)}
              />
            </div>
          </SectionCard>

          {/* 2. Ubicación */}
          <SectionCard icon={<LocationOnIcon sx={{ fontSize: 20 }} />} title="Ubicación">
            <div className="flex flex-col gap-1 md:col-span-3">
              <label className={labelCls}>Mercado</label>
              <select
                value={values.market?.value || ''}
                onChange={(e) => {
                  const selected = markets.find(o => String(o.value) === e.target.value) || null;
                  setFieldValue('market', selected);
                }}
                className={inputCls(touched.market && errors.market)}
              >
                <option value="">Seleccionar...</option>
                {markets.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
              <FieldError error={errors.market} touched={touched.market} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Puesto</label>
              <input
                name="puesto"
                type="number"
                value={values.puesto}
                onChange={handleChange}
                className={inputCls(touched.puesto && errors.puesto)}
              />
              <FieldError error={errors.puesto} touched={touched.puesto} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Nave</label>
              <input
                name="nave"
                type="number"
                value={values.nave}
                onChange={handleChange}
                className={inputCls(touched.nave && errors.nave)}
              />
              <FieldError error={errors.nave} touched={touched.nave} />
            </div>
          </SectionCard>

          {/* 3. Contacto */}
          <SectionCard icon={<PhoneIcon sx={{ fontSize: 20 }} />} title="Contacto">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Teléfono</label>
              <input
                name="telefono"
                type="tel"
                value={formatTelefono(values.telefono)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFieldValue('telefono', raw);
                }}
                placeholder="11-XXXX-XXXX"
                className={inputCls(touched.telefono && errors.telefono)}
              />
              <FieldError error={errors.telefono} touched={touched.telefono} />
            </div>
          </SectionCard>

          {/* 4. Cuenta Corriente */}
          <SectionCard icon={<AccountBalanceWalletIcon sx={{ fontSize: 20 }} />} title="Cuenta Corriente" cols={2}>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Saldo inicial</label>
              <AmountInput
                name="checkingAccount"
                value={values.checkingAccount}
                onChange={(raw) => setFieldValue('checkingAccount', raw)}
                hasError={touched.checkingAccount && Boolean(errors.checkingAccount)}
                allowNegative
              />
              <p className="mt-1 text-xs text-on-surface-muted">Positivo: La Huerta le debe a este proveedor. Negativo: tenés saldo a favor con este proveedor.</p>
            </div>
          </SectionCard>

          {/* Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => navigate('/supplier')}
              className="px-6 py-2.5 text-sm font-semibold text-on-surface-muted border border-border-subtle rounded-lg hover:border-red-400 hover:text-red-500 hover:bg-red-50 hover:font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 bg-blue-lahuerta text-white font-bold text-sm rounded-lg shadow-sm hover:bg-blue-lahuerta/90 active:scale-[0.98] transition-all"
            >
              {id ? 'Guardar cambios' : 'Registrar Proveedor'}
            </button>
          </div>

        </Form>
      )}
    </Formik>
  );
};

export default ProveedorForm;
