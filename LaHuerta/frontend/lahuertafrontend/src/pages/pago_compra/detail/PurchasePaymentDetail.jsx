import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { purchasePaymentUrl } from '../../../constants/urls';
import { HOME, PROVEEDORES } from '../../../constants/breadcrumbs';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import BackButton from '../../../components/BackButton';
import DeleteButton from '../../../components/DeleteButton';
import EditButton from '../../../components/EditButton';
import { CHECK_STATE_CONFIG } from '../../../constants/grid/Check';
import { OWN_CHECK_STATE_CONFIG } from '../../../constants/grid/OwnCheck';
import { PURCHASE_PAYMENT_TYPE_COLORS } from '../../../constants/grid/PagoCompra';
import Badge from '../../../components/Badge';
import OnAccountBadge, { CancelledBadge } from '../shared/OnAccountBadge';
import CancelPaymentMessage from '../shared/CancelPaymentMessage';
import { droppedChecksNotice, formatBuyNumber, isCancelledPayment } from '../../../constants/purchasePaymentTypes';
import { useToast } from '../../../context/ToastContext';
import { extractErrorMessage } from '../../../utils/errors';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCardOutlined';
import BlockIcon from '@mui/icons-material/Block';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import { BADGE_COLORS } from '../../../constants/badgeColors';

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

const Field = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className={labelCls}>{label}</span>
    <span className="text-sm text-on-surface">{value || '—'}</span>
  </div>
);

// Estado del cheque con el mismo formato y colores que en los listados de Cheques y Cheques emitidos.
const CheckStateBadge = ({ state, config }) => {
  const cfg = config[state] || { label: state, ...BADGE_COLORS.gray };
  return (
    <div className="flex flex-col gap-1">
      <span className={labelCls}>Estado</span>
      <Badge color={cfg} label={cfg.label || '—'} />
    </div>
  );
};

// En un pago anulado, los cheques que quedaron libres (volvieron a cartera o a estar disponibles)
// vienen como LIBERADO: el pago los sigue mostrando como registro (DEV-150).
const RELEASED_STATE = { LIBERADO: { label: 'Liberado', ...BADGE_COLORS.gray } };
const CLIENT_CHECK_STATES = { ...CHECK_STATE_CONFIG, ...RELEASED_STATE };
const OWN_CHECK_STATES = { ...OWN_CHECK_STATE_CONFIG, ...RELEASED_STATE };


const PurchasePaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { showToast } = useToast();

  // Anular (borrado lógico): el pago queda como registro con estado Anulado.
  const handleCancel = async () => {
    try {
      const response = await axios.post(`${purchasePaymentUrl}${id}/cancel/`);
      setConfirmOpen(false);
      setPayment(response.data);
      showToast('El pago se anuló correctamente.');
    } catch (err) {
      console.error('Error anulando pago de compra:', err);
      setConfirmOpen(false);
      showToast(extractErrorMessage(err, 'No se pudo anular el pago.'), { variant: 'error' });
    }
  };

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const response = await axios.get(`${purchasePaymentUrl}${id}/`);
        setPayment(response.data);
      } catch (err) {
        console.error('Error cargando pago de compra:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPayment();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el pago de compra.</p>
        <button
          onClick={() => navigate('/purchase-payment')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const supplierName = payment.proveedor?.nombre || '—';
  const typeColors = PURCHASE_PAYMENT_TYPE_COLORS[payment.tipo_pago?.descripcion];
  const buys = payment.compras || [];
  const checksNotice = droppedChecksNotice(payment);
  const cancelled = isCancelledPayment(payment);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs + Volver */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
          <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(HOME.path)}>{HOME.label}</span>
          <span className="text-xs">›</span>
          <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(PROVEEDORES.path)}>{PROVEEDORES.label}</span>
          <span className="text-xs">›</span>
          <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/purchase-payment')}>Pagos de Compras</span>
          <span className="text-xs">›</span>
          <span className="text-on-surface font-semibold">{supplierName}</span>
        </nav>
        <BackButton onClick={() => navigate('/purchase-payment')} className="shrink-0 px-5 py-2.5 text-sm" />
      </div>

      {cancelled && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <CancelledBadge />
          Pago anulado{payment.fecha_anulacion ? ` el ${formatDate(payment.fecha_anulacion)}` : ''}: queda como registro y no cuenta
          para la cuenta corriente del proveedor, sus compras ni sus cheques.
        </p>
      )}

      {/* 1. Proveedor */}
      <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Proveedor">
        <Field label="Nombre" value={supplierName} />
        <Field label="Puesto" value={payment.proveedor?.puesto} />
      </SectionCard>

      {/* 2. Datos del Pago */}
      <SectionCard icon={<PaymentsIcon sx={{ fontSize: 20 }} />} title="Datos del Pago">
        <Field label="Fecha de pago" value={formatDate(payment.fecha_pago)} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe</span>
          <span className={`text-sm font-semibold ${cancelled ? 'line-through text-on-surface-muted' : 'text-on-surface'}`}>
            {formatCurrency(payment.importe_abonado)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Tipo de pago</span>
          <Badge color={typeColors} label={payment.tipo_pago?.descripcion || '—'} />
        </div>
      </SectionCard>

      {checksNotice && (
        <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <ErrorIcon sx={{ fontSize: 18 }} />
          {checksNotice}
        </p>
      )}

      {/* 3. Compras que cubre el pago y lo que queda a cuenta */}
      <SectionCard icon={<ShoppingCartIcon sx={{ fontSize: 20 }} />} title={buys.length > 1 ? `Compras (${buys.length})` : 'Compra'} cols={1}>
        {buys.length === 0 ? (
          <div className="flex flex-col gap-2">
            <OnAccountBadge />
            <span className="text-sm text-on-surface-muted">El pago no cubre ninguna compra: es a cuenta del saldo del proveedor.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {buys.map((buy) => (
              <div key={buy.id} className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-4 border-b border-border-subtle last:border-b-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <span className={labelCls}>Compra</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/buy/detail/${buy.id}`)}
                    className="w-fit text-sm font-medium text-blue-lahuerta hover:underline"
                  >
                    N° {formatBuyNumber(buy.id)}
                  </button>
                </div>
                <Field label="Fecha" value={formatDate(buy.fecha)} />
                <Field label="Importe de la compra" value={formatCurrency(buy.importe)} />
                <div className="flex flex-col gap-1">
                  <span className={labelCls}>Aplicado en este pago</span>
                  <span className="text-sm font-semibold text-on-surface">{formatCurrency(buy.importe_aplicado)}</span>
                </div>
              </div>
            ))}
            {parseFloat(payment.importe_a_cuenta) > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-low px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-on-surface-muted">
                  <OnAccountBadge /> Lo que no se aplicó a ninguna compra
                </span>
                <span className="text-sm font-semibold text-on-surface">{formatCurrency(payment.importe_a_cuenta)}</span>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* 4. Cheques de clientes endosados en el pago */}
      {payment.cheques?.length > 0 && (
        <SectionCard icon={<CreditCardIcon sx={{ fontSize: 20 }} />} title={payment.cheques.length > 1 ? `Cheques (${payment.cheques.length})` : 'Cheque'} cols={1}>
          {payment.cheques.map((check, index) => (
            <div key={check.id ?? `deleted-${index}`} className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-border-subtle last:border-b-0 last:pb-0">
              <Field label="N° de cheque" value={check.numero} />
              <Field label="Banco" value={check.banco} />
              <Field label="Importe" value={formatCurrency(check.importe)} />
              <CheckStateBadge state={check.estado} config={CLIENT_CHECK_STATES} />
            </div>
          ))}
        </SectionCard>
      )}

      {/* 5. Cheques emitidos del pago: como los de clientes, cada uno se usa entero */}
      {payment.cheques_propios?.length > 0 && (
        <SectionCard
          icon={<CreditCardIcon sx={{ fontSize: 20 }} />}
          title={payment.cheques_propios.length > 1 ? `Cheques propios (${payment.cheques_propios.length})` : 'Cheque propio'}
          cols={1}
        >
          {payment.cheques_propios.map((ownCheck) => (
            <div key={ownCheck.id} className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-border-subtle last:border-b-0 last:pb-0">
              <Field label="N° de cheque" value={ownCheck.numero} />
              <Field label="Banco" value={ownCheck.banco} />
              <Field label="Importe" value={formatCurrency(ownCheck.importe)} />
              <CheckStateBadge state={ownCheck.estado} config={OWN_CHECK_STATES} />
            </div>
          ))}
        </SectionCard>
      )}

      {/* Acciones: mismo layout que FormActions (abajo a la derecha; en mobile apiladas a lo ancho, la principal arriba).
          Un pago anulado no se edita ni se vuelve a anular. */}
      {!cancelled && (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 border-t border-border-subtle">
          <DeleteButton onClick={() => setConfirmOpen(true)} label="Anular" icon={BlockIcon} />
          <EditButton onClick={() => navigate(`/purchase-payment/edit/${id}`)} label="Editar pago" />
        </div>
      )}

      <AlertDialog
        open={confirmOpen}
        title="Anular pago"
        message={<CancelPaymentMessage payment={payment} supplierName={supplierName} />}
        confirmLabel={<><BlockIcon sx={{ fontSize: 16 }} /> Anular</>}
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default PurchasePaymentDetail;
