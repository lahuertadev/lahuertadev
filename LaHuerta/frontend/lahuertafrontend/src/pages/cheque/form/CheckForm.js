import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadOptions } from '../../../utils/selectOptions';
import { checkUrl, bankUrl, checkStateUrl } from '../../../constants/urls';
import Toast from '../../../components/Toast';
import BasicDatePicker from '../../../components/DatePicker';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

// ── Estilos reutilizables ─────────────────────────────────────────────────────
const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
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
const CheckForm = () => {
  const [selectOptions, setSelectOptions] = useState({ banks: [], states: [] });
  const [initialValues, setInitialValues] = useState({
    numero: '',
    bank: '',
    amount: '',
    issueDate: null,
    depositDate: null,
    state: '',
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, message: '' });

  const loadInitialOptions = async () => {
    const [banks, states] = await Promise.all([
      loadOptions(bankUrl, (data) =>
        data.map((b) => ({ name: b.descripcion, value: b.id }))
      ),
      loadOptions(checkStateUrl, (data) =>
        data
          .filter((s) => s.descripcion !== 'ENDOSADO')
          .map((s) => ({ name: s.descripcion, value: s.id }))
      ),
    ]);
    setSelectOptions({ banks, states });
  };

  const fetchItemToEdit = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`${checkUrl}${id}/`);
      const data = response.data;
      setInitialValues({
        numero: data.numero,
        bank: data.banco.id,
        amount: data.importe,
        issueDate: data.fecha_emision,
        depositDate: data.fecha_deposito || null,
        state: data.estado?.id || '',
      });
    } catch (error) {
      console.error('Error al cargar el cheque:', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      await loadInitialOptions();
      await fetchItemToEdit();
    };
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const validationSchema = Yup.object({
    numero: Yup.number()
      .required('Requerido')
      .positive('Debe ser mayor a cero')
      .integer('Debe ser un número entero'),
    bank: Yup.string().required('Requerido'),
    amount: Yup.number()
      .required('Requerido')
      .positive('El importe debe ser mayor a cero'),
    issueDate: Yup.date().nullable().required('Requerido'),
    state: Yup.string().required('Requerido'),
  });

  const handleSubmit = async (values) => {
    try {
      const payload = {
        numero: values.numero,
        importe: values.amount,
        fecha_emision: values.issueDate,
        fecha_deposito: values.depositDate || null,
        banco: values.bank,
        estado: values.state,
      };
      if (id) {
        await axios.put(`${checkUrl}${id}/`, payload);
      } else {
        await axios.post(checkUrl, payload);
      }
      navigate('/check');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
      const msg = error?.response?.data?.detail || 'Error al guardar el cheque.';
      setToast({ open: true, message: msg });
    }
  };

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
          <nav className="flex items-center gap-2 text-sm font-medium text-on-surface-muted">
            <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/')}>Home</span>
            <span className="text-xs">›</span>
            <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/check')}>Cheques</span>
            <span className="text-xs">›</span>
            <span className="text-on-surface font-semibold">{id ? 'Editar' : 'Nuevo'}</span>
          </nav>

          {/* 1. Datos del cheque */}
          <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Datos del Cheque" cols={3}>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Número</label>
              <input
                name="numero"
                type="number"
                value={values.numero}
                onChange={handleChange}
                placeholder="Nº de cheque"
                className={inputCls(touched.numero && errors.numero)}
                disabled={!!id}
              />
              <FieldError error={errors.numero} touched={touched.numero} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Banco</label>
              <select
                value={values.bank}
                onChange={(e) => setFieldValue('bank', e.target.value)}
                className={inputCls(touched.bank && errors.bank)}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.banks.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
              <FieldError error={errors.bank} touched={touched.bank} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Importe</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                value={values.amount}
                onChange={handleChange}
                placeholder="0.00"
                className={inputCls(touched.amount && errors.amount)}
              />
              <FieldError error={errors.amount} touched={touched.amount} />
            </div>
          </SectionCard>

          {/* 2. Fechas */}
          <SectionCard icon={<CalendarTodayIcon sx={{ fontSize: 20 }} />} title="Fechas" cols={3}>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Fecha de emisión</label>
              <BasicDatePicker
                value={values.issueDate}
                onChange={(date) => setFieldValue('issueDate', date)}
                hasError={touched.issueDate && Boolean(errors.issueDate)}
              />
              <FieldError error={errors.issueDate} touched={touched.issueDate} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Fecha de depósito</label>
              <BasicDatePicker
                value={values.depositDate}
                onChange={(date) => setFieldValue('depositDate', date)}
                hasError={false}
              />
            </div>
          </SectionCard>

          {/* 3. Estado */}
          <SectionCard icon={<VerifiedUserIcon sx={{ fontSize: 20 }} />} title="Estado" cols={3}>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Estado del cheque</label>
              <select
                value={values.state}
                onChange={(e) => setFieldValue('state', e.target.value)}
                className={inputCls(touched.state && errors.state)}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.states.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
              <FieldError error={errors.state} touched={touched.state} />
            </div>
          </SectionCard>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => navigate('/check')}
              className="px-6 py-2.5 text-sm font-semibold text-on-surface-muted hover:bg-surface-low rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 bg-blue-lahuerta text-white font-bold text-sm rounded-lg shadow-sm hover:bg-blue-lahuerta/90 active:scale-[0.98] transition-all"
            >
              {id ? 'Guardar cambios' : 'Registrar Cheque'}
            </button>
          </div>

        </Form>
      )}
    </Formik>
  );
};

export default CheckForm;
