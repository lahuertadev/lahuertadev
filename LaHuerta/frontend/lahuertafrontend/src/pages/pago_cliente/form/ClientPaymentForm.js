import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadOptions } from '../../../utils/selectOptions';
import { clientPaymentUrl, clientUrl, paymentTypeUrl, bankUrl } from '../../../constants/urls';
import Toast from '../../../components/Toast';
import BasicDatePicker from '../../../components/DatePicker';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

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
const ClientPaymentForm = () => {
  const [selectOptions, setSelectOptions] = useState({ clients: [], paymentTypes: [], banks: [] });
  const [initialValues, setInitialValues] = useState({
    client: '',
    amount: '',
    paymentDate: null,
    paymentType: '',
    observations: '',
    chequeNumero: '',
    chequeBanco: '',
    chequeFechaEmision: null,
    chequeDiferido: false,
    chequeFechaDeposito: null,
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, message: '' });

  const loadInitialOptions = async () => {
    const [clients, paymentTypes, banks] = await Promise.all([
      loadOptions(clientUrl, (data) =>
        data.map((c) => ({ name: `${c.cuit} - ${c.razon_social}`, value: c.id }))
      ),
      loadOptions(paymentTypeUrl, (data) =>
        data.map((t) => ({ name: t.descripcion, value: t.id }))
      ),
      loadOptions(bankUrl, (data) =>
        data.map((b) => ({ name: b.descripcion, value: b.id }))
      ),
    ]);
    setSelectOptions({ clients, paymentTypes, banks });
  };

  const fetchItemToEdit = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`${clientPaymentUrl}${id}/`);
      const data = response.data;
      const check = data.cheque;
      setInitialValues({
        client: data.cliente.id,
        amount: data.importe,
        paymentDate: data.fecha_pago,
        paymentType: data.tipo_pago.id,
        observations: data.observaciones || '',
        chequeNumero: check?.numero || '',
        chequeBanco: check?.banco || '',
        chequeFechaEmision: check?.fecha_emision || null,
        chequeDiferido: !!check?.fecha_deposito,
        chequeFechaDeposito: check?.fecha_deposito || null,
      });
    } catch (error) {
      console.error('Error al cargar el pago:', error);
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
    client: Yup.string().required('Requerido'),
    amount: Yup.number().required('Requerido').positive('El importe debe ser mayor a cero'),
    paymentDate: Yup.date().nullable().required('Requerido'),
    paymentType: Yup.string().required('Requerido'),
  });

  const validate = (values) => {
    const errors = {};
    const selected = selectOptions.paymentTypes.find(
      (opt) => String(opt.value) === String(values.paymentType)
    );
    if (selected?.name === 'Cheque') {
      if (!values.chequeNumero) errors.chequeNumero = 'Requerido';
      if (!values.chequeBanco) errors.chequeBanco = 'Requerido';
      if (!values.chequeFechaEmision) errors.chequeFechaEmision = 'Requerido';
    }
    return errors;
  };

  const handleSubmit = async (values) => {
    const selected = selectOptions.paymentTypes.find(
      (opt) => String(opt.value) === String(values.paymentType)
    );
    const isCheck = selected?.name === 'Cheque';

    const payload = {
      cliente: values.client,
      importe: values.amount,
      fecha_pago: values.paymentDate,
      tipo_pago: values.paymentType,
      observaciones: values.observations || null,
    };

    if (isCheck) {
      payload.cheque_numero = values.chequeNumero;
      payload.cheque_banco = values.chequeBanco;
      payload.cheque_fecha_emision = values.chequeFechaEmision;
      payload.cheque_fecha_deposito = values.chequeFechaDeposito || null;
    }

    try {
      if (id) {
        await axios.put(`${clientPaymentUrl}${id}/`, payload);
      } else {
        await axios.post(clientPaymentUrl, payload);
      }
      navigate('/client-payment');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
      const msg = error?.response?.data?.detail || 'Error al guardar el pago.';
      setToast({ open: true, message: msg });
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      validate={validate}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, handleChange, setFieldValue }) => {
        const selectedPaymentType = selectOptions.paymentTypes.find(
          (opt) => String(opt.value) === String(values.paymentType)
        );
        const isCheckPayment = selectedPaymentType?.name === 'Cheque';

        return (
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
              <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/client-payment')}>Pagos de Clientes</span>
              <span className="text-xs">›</span>
              <span className="text-on-surface font-semibold">{id ? 'Editar' : 'Nuevo'}</span>
            </nav>

            {/* 1. Datos del pago */}
            <SectionCard icon={<PersonIcon sx={{ fontSize: 20 }} />} title="Datos del Pago" cols={3}>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Cliente</label>
                <select
                  value={values.client}
                  onChange={(e) => setFieldValue('client', e.target.value)}
                  className={inputCls(touched.client && errors.client)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.clients.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.client} touched={touched.client} />
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
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Fecha de pago</label>
                <BasicDatePicker
                  value={values.paymentDate}
                  onChange={(date) => setFieldValue('paymentDate', date)}
                  hasError={touched.paymentDate && Boolean(errors.paymentDate)}
                />
                <FieldError error={errors.paymentDate} touched={touched.paymentDate} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Tipo de pago</label>
                <select
                  value={values.paymentType}
                  onChange={(e) => setFieldValue('paymentType', e.target.value)}
                  className={inputCls(touched.paymentType && errors.paymentType)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.paymentTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.paymentType} touched={touched.paymentType} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className={labelCls}>Observaciones</label>
                <input
                  name="observations"
                  type="text"
                  value={values.observations}
                  onChange={handleChange}
                  placeholder="Opcional..."
                  className={inputCls(false)}
                />
              </div>
            </SectionCard>

            {/* 2. Datos del cheque (condicional) */}
            {isCheckPayment && (
              <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Datos del Cheque" cols={3}>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Número</label>
                  <input
                    name="chequeNumero"
                    type="number"
                    min="1"
                    value={values.chequeNumero}
                    onChange={handleChange}
                    placeholder="Nº de cheque"
                    disabled={!!(id && values.chequeNumero)}
                    className={inputCls(touched.chequeNumero && errors.chequeNumero) + ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' + (id && values.chequeNumero ? ' opacity-50 cursor-not-allowed' : '')}
                  />
                  <FieldError error={errors.chequeNumero} touched={touched.chequeNumero} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Banco</label>
                  <select
                    value={values.chequeBanco}
                    onChange={(e) => setFieldValue('chequeBanco', e.target.value)}
                    className={inputCls(touched.chequeBanco && errors.chequeBanco)}
                  >
                    <option value="">Seleccionar...</option>
                    {selectOptions.banks.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.name}</option>
                    ))}
                  </select>
                  <FieldError error={errors.chequeBanco} touched={touched.chequeBanco} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Fecha de emisión</label>
                  <BasicDatePicker
                    value={values.chequeFechaEmision}
                    onChange={(date) => setFieldValue('chequeFechaEmision', date)}
                    hasError={touched.chequeFechaEmision && Boolean(errors.chequeFechaEmision)}
                  />
                  <FieldError error={errors.chequeFechaEmision} touched={touched.chequeFechaEmision} />
                </div>
                <div className="md:col-span-3 flex items-center gap-6 bg-surface-low/50 border border-border-subtle px-5 py-4 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={values.chequeDiferido}
                      onChange={(e) => {
                        setFieldValue('chequeDiferido', e.target.checked);
                        if (!e.target.checked) setFieldValue('chequeFechaDeposito', null);
                      }}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-lahuerta after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Cheque diferido</p>
                      <p className="text-xs text-on-surface-muted">El cheque tiene una fecha futura a partir de la cual puede depositarse</p>
                    </div>
                  </label>
                  {values.chequeDiferido && (
                    <div className="flex flex-col gap-1 min-w-[180px]">
                      <label className={labelCls}>Fecha de depósito</label>
                      <BasicDatePicker
                        value={values.chequeFechaDeposito}
                        onChange={(date) => setFieldValue('chequeFechaDeposito', date)}
                        hasError={false}
                      />
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => navigate('/client-payment')}
                className="px-6 py-2.5 text-sm font-semibold text-on-surface-muted hover:bg-surface-low rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 bg-blue-lahuerta text-white font-bold text-sm rounded-lg shadow-sm hover:bg-blue-lahuerta/90 active:scale-[0.98] transition-all"
              >
                {id ? 'Guardar cambios' : 'Registrar Pago'}
              </button>
            </div>

          </Form>
        );
      }}
    </Formik>
  );
};

export default ClientPaymentForm;
