import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { buyUrl, purchasePaymentUrl } from '../../../constants/urls';
import { formatBuyNumber, isCancelledPayment } from '../../../constants/purchasePaymentTypes';
import { formatCurrency } from '../../../utils/currency';
import { formatSupplierLabel } from '../../../utils/supplier';
import Toast from '../../../components/Toast';
import { useToast } from '../../../context/ToastContext';
import AlertDialog from '../../../components/DialogAlert';
import BasicDatePicker from '../../../components/DatePicker';
import AmountInput from '../../../components/AmountInput';
import BackButton from '../../../components/BackButton';
import FormActions from '../../../components/FormActions';
import RequiredMark from '../../../components/RequiredMark';
import PurchaseAllocationList, { ALLOCATION_HELP_TEXT } from '../shared/PurchaseAllocationList';
import { allocationErrors, applicationsPayload, onAccountAmount, releasedBuys, sortOldestFirst } from '../shared/allocation';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const readonlyCls =
  'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted select-none cursor-not-allowed';

const SectionCard = ({ icon, title, children, cols = 2, helpText }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      {helpText && (
        <Tooltip title={helpText} placement="top" arrow>
          <InfoOutlinedIcon aria-label={helpText} sx={{ fontSize: 16, color: '#9ca3af', cursor: 'help', '&:hover': { color: '#4a7bc4' } }} />
        </Tooltip>
      )}
    </div>
    <div className={`bg-surface-card p-4 sm:p-6 rounded-xl shadow-sm border border-border-subtle grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
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

// Cheques del pago, uno por línea, con su importe (cada cheque se usa entero).
const checkLines = (payment) => [
  ...(payment.cheques || []).map((check) => `N° ${check.numero} — ${check.banco} — ${formatCurrency(check.importe)}`),
  ...(payment.cheques_propios || []).map(
    (ownCheck) => `N° ${ownCheck.numero} — ${ownCheck.banco} — ${formatCurrency(ownCheck.importe)}`
  ),
];

// Aviso antes de guardar una edición que deja compras sin cubrir (o menos cubiertas) por el pago.
const ReleasedBuysMessage = ({ released, onAccount }) => (
  <div className="space-y-2">
    <p>{released.length > 1 ? 'Estas compras dejan' : 'Esta compra deja'} de estar cubiertas por este pago:</p>
    <ul className="list-disc pl-5 space-y-1">
      {released.map((buy) => (
        <li key={buy.id}>Compra N° {formatBuyNumber(buy.id)}: vuelve a deber {formatCurrency(buy.released)}</li>
      ))}
    </ul>
    {parseFloat(onAccount) > 0 && (
      <p className="text-on-surface-muted">Quedan {formatCurrency(onAccount)} del pago a cuenta del proveedor.</p>
    )}
  </div>
);

const formatDetailAmounts = (msg) =>
  msg.replace(/\((\d+(?:\.\d+)?)\)/g, (_, num) => `(${formatCurrency(parseFloat(num))})`);

/**
 * Compras que puede cubrir el pago al editarlo: las del proveedor con saldo pendiente y las que el
 * pago ya cubre. A cada una se le puede aplicar su saldo más lo que este pago ya le aplicaba.
 */
export const editableBuys = (buys, payment) => {
  const applied = Object.fromEntries((payment.compras || []).map((buy) => [buy.id, parseFloat(buy.importe_aplicado) || 0]));
  return sortOldestFirst(
    buys
      .map((buy) => ({
        id: buy.id,
        fecha: buy.fecha,
        importe: buy.importe,
        available: ((parseFloat(buy.outstanding_balance) || 0) + (applied[buy.id] || 0)).toFixed(2),
      }))
      .filter((buy) => parseFloat(buy.available) > 0 || applied[buy.id] !== undefined)
  );
};

// Edición de un pago a proveedor: la fecha, las compras que cubre y, si no es con cheques, el
// importe. El proveedor y el medio de pago no se cambian; para eso se elimina el pago y se carga de nuevo.
const PurchasePaymentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [payment, setPayment] = useState(null);
  const [buys, setBuys] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '' });
  // Edición pendiente de confirmar porque deja compras sin cubrir: { values, helpers, released }.
  const [pendingSave, setPendingSave] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${purchasePaymentUrl}${id}/`);
        const { data: supplierBuys } = await axios.get(`${buyUrl}?proveedor_id=${data.proveedor.id}`);
        setPayment(data);
        setBuys(editableBuys(supplierBuys, data));
      } catch {
        setLoadError(true);
      }
    };
    load();
  }, [id]);

  if (loadError) {
    return <p className="w-full max-w-5xl mx-auto text-sm text-red-500">Error al cargar el pago.</p>;
  }

  if (!payment || !buys) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Un pago anulado queda como registro: no se edita (el backend también lo rechaza).
  if (isCancelledPayment(payment)) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-on-surface">Este pago está anulado: queda como registro y no se puede editar.</p>
        <BackButton onClick={() => navigate(`/purchase-payment/detail/${id}`)} className="px-5 py-2.5 text-sm" />
      </div>
    );
  }

  const supplierName = payment.proveedor ? formatSupplierLabel(payment.proveedor) : null;
  const paidChecks = checkLines(payment);
  // Con cheques el importe sale de los cheques: no se edita.
  const amountLocked = paidChecks.length > 0;
  const currentApplications = (payment.compras || []).filter((buy) => parseFloat(buy.importe_aplicado) > 0);

  // El importe se valida solo si se puede editar: un pago con cheques puede haber quedado en cero
  // por un cheque rechazado y aun así se le cambia la fecha o las compras.
  const validationSchema = Yup.object({
    paymentDate: Yup.date().nullable().required('Requerido'),
    amount: amountLocked ? Yup.string() : Yup.number().required('Requerido').positive('El importe debe ser mayor a cero'),
  });

  const validate = (values) => {
    const errors = {};
    const allocation = allocationErrors(buys, values.allocations, values.amount);
    if (Object.keys(allocation.rows).length || allocation.total) errors.allocations = allocation.total || 'Revisá lo aplicado a las compras.';
    return errors;
  };

  const handleSubmit = (values, helpers) => {
    const released = releasedBuys(currentApplications, values.allocations);
    if (released.length) {
      setPendingSave({ values, helpers, released });
      return;
    }
    return save(values, helpers);
  };

  const confirmPendingSave = () => {
    const { values, helpers } = pendingSave;
    setPendingSave(null);
    save(values, helpers);
  };

  const save = async (values, { setFieldError }) => {
    const body = { fecha_pago: values.paymentDate, compras: applicationsPayload(values.allocations) };
    if (!amountLocked) body.importe_abonado = values.amount;
    try {
      await axios.put(`${purchasePaymentUrl}${id}/`, body);
      showToast('El pago se actualizó correctamente.');
      navigate(`/purchase-payment/detail/${id}`);
    } catch (error) {
      const data = error?.response?.data || {};
      const detail = String(data.detail || data.compras?.[0] || '');
      if (!amountLocked && detail.toLowerCase().includes('importe del pago')) {
        setFieldError('amount', formatDetailAmounts(detail));
      } else {
        setToast({ open: true, message: detail ? formatDetailAmounts(detail) : 'Error al editar el pago.' });
      }
    }
  };

  return (
    <Formik
      initialValues={{
        paymentDate: payment.fecha_pago,
        amount: String(payment.importe_abonado),
        selectedBuys: currentApplications.map((buy) => String(buy.id)),
        allocations: Object.fromEntries(currentApplications.map((buy) => [buy.id, String(buy.importe_aplicado)])),
      }}
      validationSchema={validationSchema}
      validate={validate}
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, setFieldValue, isSubmitting, dirty, submitCount }) => (
        <Form className="w-full max-w-5xl mx-auto space-y-8 pb-12">
          <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} responsive />
          <AlertDialog
            open={Boolean(pendingSave)}
            tone="warning"
            title="Confirmar cambios"
            message={pendingSave && (
              <ReleasedBuysMessage released={pendingSave.released} onAccount={onAccountAmount(values.allocations, values.amount)} />
            )}
            onConfirm={confirmPendingSave}
            onCancel={() => setPendingSave(null)}
          />

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
              Para cambiar el proveedor o el medio de pago, eliminá el pago y cargalo de nuevo.
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

          <SectionCard icon={<ShoppingCartIcon sx={{ fontSize: 20 }} />} title="Compras que cubre" cols={1} helpText={ALLOCATION_HELP_TEXT}>
            <div data-tour="payment-buys">
              <PurchaseAllocationList buys={buys} paymentAmount={values.amount} keepInitial showErrors={submitCount > 0} />
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
