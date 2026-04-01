import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadOptions } from '../../../utils/selectOptions';
import { purchasePaymentUrl, buyUrl, paymentTypeUrl, checkUrl } from '../../../constants/urls';
import Toast from '../../../components/Toast';
import BasicDatePicker from '../../../components/DatePicker';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

// ── Estilos ───────────────────────────────────────────────────────────────────
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
const PurchasePaymentForm = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, message: '' });
  const [selectOptions, setSelectOptions] = useState({
    buys: [],
    paymentTypes: [],
    checks: [],
  });

  const initialValues = {
    buy: '',
    amount: '',
    paymentDate: null,
    paymentType: '',
    chequeNumero: '',
  };

  const loadInitialOptions = async () => {
    const [buys, paymentTypes, checks] = await Promise.all([
      loadOptions(buyUrl, (data) =>
        data.map((b) => ({
          name: `${b.fecha} — ${b.proveedor?.nombre || b.proveedor}`,
          value: b.id,
        }))
      ),
      loadOptions(paymentTypeUrl, (data) =>
        data.map((t) => ({ name: t.descripcion, value: t.id }))
      ),
      loadOptions(`${checkUrl}?estado=EN_CARTERA`, (data) =>
        data.map((c) => ({
          name: `Nro. ${c.numero} — ${c.banco?.descripcion || c.banco} — $${c.importe}`,
          value: c.numero,
        }))
      ),
    ]);
    setSelectOptions({ buys, paymentTypes, checks });
  };

  useEffect(() => {
    loadInitialOptions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validationSchema = Yup.object({
    buy: Yup.string().required('Requerido'),
    amount: Yup.number().required('Requerido').positive('El importe debe ser mayor a cero'),
    paymentDate: Yup.date().nullable().required('Requerido'),
    paymentType: Yup.string().required('Requerido'),
  });

  const validate = (values) => {
    const errors = {};
    const selected = selectOptions.paymentTypes.find(
      (opt) => String(opt.value) === String(values.paymentType)
    );
    if (selected?.name === 'Cheque' && !values.chequeNumero) {
      errors.chequeNumero = 'Requerido cuando el tipo de pago es cheque.';
    }
    return errors;
  };

  const handleSubmit = async (values) => {
    const selected = selectOptions.paymentTypes.find(
      (opt) => String(opt.value) === String(values.paymentType)
    );
    const isCheck = selected?.name === 'Cheque';

    const payload = {
      compra: values.buy,
      importe_abonado: values.amount,
      fecha_pago: values.paymentDate,
      tipo_pago: values.paymentType,
    };

    if (isCheck) {
      payload.cheque_numero = values.chequeNumero;
    }

    try {
      await axios.post(purchasePaymentUrl, payload);
      navigate('/purchase-payment');
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.cheque_numero?.[0] ||
        'Error al registrar el pago.';
      setToast({ open: true, message: msg });
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      validate={validate}
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
              <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/purchase-payment')}>Pagos de Compras</span>
              <span className="text-xs">›</span>
              <span className="text-on-surface font-semibold">Nuevo</span>
            </nav>

            {/* 1. Datos del pago */}
            <SectionCard icon={<ShoppingCartIcon sx={{ fontSize: 20 }} />} title="Datos del Pago" cols={2}>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Compra</label>
                <select
                  value={values.buy}
                  onChange={(e) => setFieldValue('buy', e.target.value)}
                  className={inputCls(touched.buy && errors.buy)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.buys.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.buy} touched={touched.buy} />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Importe abonado</label>
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
                  onChange={(e) => {
                    setFieldValue('paymentType', e.target.value);
                    setFieldValue('chequeNumero', '');
                  }}
                  className={inputCls(touched.paymentType && errors.paymentType)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.paymentTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.paymentType} touched={touched.paymentType} />
              </div>
            </SectionCard>

            {/* 2. Selector de cheque (condicional) */}
            {isCheckPayment && (
              <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Cheque" cols={1}>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Cheque en cartera</label>
                  <select
                    value={values.chequeNumero}
                    onChange={(e) => setFieldValue('chequeNumero', e.target.value)}
                    className={inputCls(touched.chequeNumero && errors.chequeNumero)}
                  >
                    <option value="">Seleccionar cheque...</option>
                    {selectOptions.checks.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.name}</option>
                    ))}
                  </select>
                  <FieldError error={errors.chequeNumero} touched={touched.chequeNumero} />
                  {selectOptions.checks.length === 0 && (
                    <p className="mt-1 text-xs text-on-surface-muted">No hay cheques en cartera disponibles.</p>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => navigate('/purchase-payment')}
                className="px-6 py-2.5 text-sm font-semibold text-on-surface-muted hover:bg-surface-low rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 bg-blue-lahuerta text-white font-bold text-sm rounded-lg shadow-sm hover:bg-blue-lahuerta/90 active:scale-[0.98] transition-all"
              >
                Registrar Pago
              </button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};

export default PurchasePaymentForm;
