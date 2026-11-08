import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { purchasePaymentUrl } from '../../../constants/urls';
import { formatBuyNumber, ON_ACCOUNT_LABEL } from '../../../constants/purchasePaymentTypes';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import Toast from '../../../components/Toast';
import BasicDatePicker from '../../../components/DatePicker';
import AmountInput from '../../../components/AmountInput';
import BackButton from '../../../components/BackButton';
import FormActions from '../../../components/FormActions';
import RequiredMark from '../../../components/RequiredMark';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const readonlyCls =
  'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted select-none cursor-not-allowed';

const SectionCard = ({ icon, title, children }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
    </div>
    <div className="bg-surface-card p-4 sm:p-6 rounded-xl shadow-sm border border-border-subtle grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  </section>
);

const ReadonlyField = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <label className={labelCls}>{label}</label>
    <div className={readonlyCls}>{value || '—'}</div>
  </div>
);

// Cheques del pago, uno por línea: los de clientes por su importe y los emitidos por lo usado.
const checkLines = (payment) => [
  ...(payment.cheques || []).map((check) => `N° ${check.numero} — ${check.banco} — ${formatCurrency(check.importe)}`),
  ...(payment.cheques_propios || []).map(
    (ownCheck) => `N° ${ownCheck.numero} — ${ownCheck.banco} — ${formatCurrency(ownCheck.importe_usado)} usados`
  ),
];

const formatDetailAmounts = (msg) =>
  msg.replace(/\((\d+(?:\.\d+)?)\)/g, (_, num) => `(${formatCurrency(parseFloat(num))})`);

// Edición de un pago a proveedor: solo la fecha y el importe. El proveedor, la compra y el
// medio de pago no se cambian; para eso se elimina el pago y se carga de nuevo.
const PurchasePaymentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '' });

  useEffect(() => {
    axios.get(`${purchasePaymentUrl}${id}/`)
      .then(({ data }) => setPayment(data))
      .catch(() => setLoadError(true));
  }, [id]);

  const validationSchema = Yup.object({
    paymentDate: Yup.date().nullable().required('Requerido'),
    amount: Yup.number().required('Requerido').positive('El importe debe ser mayor a cero'),
  });

  const handleSubmit = async (values, { setFieldError }) => {
    try {
      await axios.put(`${purchasePaymentUrl}${id}/`, {
        importe_abonado: values.amount,
        fecha_pago: values.paymentDate,
      });
      navigate(`/purchase-payment/detail/${id}`);
    } catch (error) {
      const detail = error?.response?.data?.detail || '';
      if (detail.toLowerCase().includes('saldo')) {
        setFieldError('amount', formatDetailAmounts(detail));
      } else {
        setToast({ open: true, message: detail || 'Error al editar el pago.' });
      }
    }
  };

  if (loadError) {
    return <p className="w-full max-w-5xl mx-auto text-sm text-red-500">Error al cargar el pago.</p>;
  }

  if (!payment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const concept = payment.compra
    ? `Compra N° ${formatBuyNumber(payment.compra.id)} · ${formatDate(payment.compra.fecha)}`
    : ON_ACCOUNT_LABEL;
  const supplierName = payment.proveedor
    ? `${payment.proveedor.nombre} — Puesto ${payment.proveedor.puesto}`
    : null;
  const paidChecks = checkLines(payment);
  // Con cheques el importe sale de los cheques: solo se edita la fecha.
  const amountLocked = paidChecks.length > 0;

  return (
    <Formik
      initialValues={{ paymentDate: payment.fecha_pago, amount: String(payment.importe_abonado) }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, setFieldValue, isSubmitting, dirty }) => (
        <Form className="w-full max-w-5xl mx-auto space-y-8 pb-12">
          <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} responsive />

          {/* Breadcrumbs + Volver */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
            <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
              <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
              <span className="text-xs">›</span>
              <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/purchase-payment')}>Pagos de Compras</span>
              <span className="text-xs">›</span>
              <span className="whitespace-nowrap text-on-surface font-semibold">Pago N° {formatBuyNumber(payment.id)}</span>
            </nav>
            <BackButton onClick={() => navigate(`/purchase-payment/detail/${id}`)} className="shrink-0 px-5 py-2.5 text-sm" />
          </div>

          <SectionCard icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />} title="Pago">
            <ReadonlyField label="Proveedor" value={supplierName} />
            <ReadonlyField label="Concepto" value={concept} />
            <ReadonlyField label="Tipo de pago" value={payment.tipo_pago?.descripcion} />
            {paidChecks.length > 0 && (
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className={labelCls}>{paidChecks.length > 1 ? `Cheques (${paidChecks.length})` : 'Cheque'}</label>
                <div className={readonlyCls}>
                  {paidChecks.map((line) => <div key={line}>{line}</div>)}
                </div>
              </div>
            )}
            <p className="md:col-span-2 flex items-start gap-1.5 text-xs text-on-surface-muted">
              <InfoOutlinedIcon sx={{ fontSize: 15 }} />
              Para cambiar el proveedor, la compra o el medio de pago, eliminá el pago y cargalo de nuevo.
            </p>
          </SectionCard>

          <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Datos del pago">
            <div className="flex flex-col gap-1" data-tour="payment-date">
              <label className={labelCls}>Fecha de pago<RequiredMark /></label>
              <BasicDatePicker
                value={values.paymentDate}
                onChange={(date) => setFieldValue('paymentDate', date)}
                hasError={touched.paymentDate && Boolean(errors.paymentDate)}
                error={touched.paymentDate && errors.paymentDate}
                required
              />
            </div>
            <div className="flex flex-col gap-1" data-tour="payment-amount">
              <label className={labelCls}>Importe abonado<RequiredMark /></label>
              <AmountInput
                name="amount"
                value={values.amount}
                onChange={(raw) => setFieldValue('amount', raw)}
                hasError={Boolean(errors.amount)}
                disabled={amountLocked}
              />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
              <p className="mt-1 text-xs text-on-surface-muted">
                {amountLocked
                  ? 'El importe sale de los cheques del pago. Para cambiarlo, eliminá el pago y cargalo de nuevo.'
                  : 'La diferencia con el importe anterior se ajusta en la cuenta corriente del proveedor.'}
              </p>
            </div>
          </SectionCard>

          <FormActions
            onCancel={() => navigate(`/purchase-payment/detail/${id}`)}
            confirmLabel={isSubmitting ? 'Guardando...' : <><SaveOutlinedIcon sx={{ fontSize: 18 }} /> Guardar cambios</>}
            confirmType="submit"
            confirmDisabled={!dirty || isSubmitting}
          />
        </Form>
      )}
    </Formik>
  );
};

export default PurchasePaymentEdit;
