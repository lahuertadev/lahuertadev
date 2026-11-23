import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { clientPaymentUrl } from '../../../constants/urls';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { extractErrorMessage } from '../../../utils/errors';
import AlertDialog from '../../../components/DialogAlert';
import BackButton from '../../../components/BackButton';
import PageHeader from '../../../components/PageHeader';
import DeleteButton from '../../../components/DeleteButton';
import EditButton from '../../../components/EditButton';
import ReasonField from '../../../components/ReasonField';
import StatusBadge from '../../../components/StatusBadge';
import Badge from '../../../components/Badge';
import { useToast } from '../../../context/ToastContext';
import { CHECK_STATE_CONFIG } from '../../../constants/grid/Check';
import { BADGE_COLORS } from '../../../constants/badgeColors';
import { isCancelledClientPayment, rejectedChecksNotice } from '../../../constants/clientPayment';
import { CancelledBadge } from '../../pago_compra/shared/OnAccountBadge';
import PersonIcon from '@mui/icons-material/PersonOutline';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCardOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import CancelClientPaymentMessage from '../shared/CancelClientPaymentMessage';

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

// Estado del cheque con el mismo formato y colores que en el listado de Cheques.
const CheckStateBadge = ({ state }) => {
  const cfg = CHECK_STATE_CONFIG[state] || { label: state, ...BADGE_COLORS.gray };
  return (
    <div className="flex flex-col gap-1">
      <span className={labelCls}>Estado</span>
      <Badge color={cfg} label={cfg.label || '—'} />
    </div>
  );
};

const ClientPaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');

  const closeConfirm = () => {
    setConfirmOpen(false);
    setReason('');
  };

  // Anular (borrado lógico): el pago queda como registro con estado Anulado y el motivo.
  const handleCancel = async () => {
    try {
      const response = await axios.post(`${clientPaymentUrl}${id}/cancel/`, { motivo: reason.trim() });
      setPayment(response.data);
      showToast('El pago se anuló correctamente.');
    } catch (err) {
      console.error('Error anulando el pago:', err);
      showToast(extractErrorMessage(err, 'No se pudo anular el pago.'), { variant: 'error' });
    } finally {
      closeConfirm();
    }
  };

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const response = await axios.get(`${clientPaymentUrl}${id}/`);
        setPayment(response.data);
      } catch (err) {
        console.error('Error cargando pago:', err);
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
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el pago.</p>
        <button
          onClick={() => navigate('/client-payment')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const cancelled = isCancelledClientPayment(payment);
  const checksNotice = rejectedChecksNotice(payment);
  const checks = payment.cheques || [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', path: '/' },
          { label: 'Pagos de Clientes', path: '/client-payment' },
          { label: payment.cliente.razon_social },
        ]}
        onBack={() => navigate('/client-payment')}
      />

      {cancelled && (
        <div className="space-y-1 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <p className="flex flex-wrap items-center gap-2">
            <CancelledBadge />
            Pago anulado{payment.fecha_anulacion ? ` el ${formatDate(payment.fecha_anulacion)}` : ''}: queda como registro y no
            cuenta para la cuenta corriente del cliente.
          </p>
          {payment.motivo_anulacion && (
            <p><span className="font-semibold">Motivo:</span> {payment.motivo_anulacion}</p>
          )}
        </div>
      )}

      {/* 1. Cliente */}
      <SectionCard icon={<PersonIcon sx={{ fontSize: 20 }} />} title="Cliente" cols={3}>
        <Field label="Razón Social" value={payment.cliente.razon_social} />
        <Field label="CUIT" value={payment.cliente.cuit} />
      </SectionCard>

      {/* 2. Datos del pago */}
      <SectionCard icon={<PaymentsIcon sx={{ fontSize: 20 }} />} title="Datos del Pago">
        <Field label="Fecha" value={formatDate(payment.fecha_pago)} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe</span>
          <span className={`text-sm font-semibold ${cancelled ? 'line-through text-on-surface-muted' : 'text-on-surface'}`}>
            {formatCurrency(payment.importe)}
          </span>
        </div>
        <Field label="Tipo de pago" value={payment.tipo_pago.descripcion} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Estado</span>
          <StatusBadge tone={cancelled ? 'danger' : 'success'} label={cancelled ? 'Anulado' : 'Vigente'} />
        </div>
        {payment.observaciones && (
          <div className="md:col-span-3 flex flex-col gap-1">
            <span className={labelCls}>Observaciones</span>
            <span className="text-sm text-on-surface">{payment.observaciones}</span>
          </div>
        )}
        {checksNotice && (
          <p className="md:col-span-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <ErrorIcon sx={{ fontSize: 18 }} className="shrink-0 mt-0.5" />
            {checksNotice}
          </p>
        )}
      </SectionCard>

      {/* 3. Cheques del pago (si aplica) */}
      {checks.length > 0 && (
        <SectionCard
          icon={<CreditCardIcon sx={{ fontSize: 20 }} />}
          title={checks.length > 1 ? `Cheques (${checks.length})` : 'Cheque'}
          cols={1}
        >
          {checks.map((check) => (
            <div key={check.id} className="grid grid-cols-2 md:grid-cols-6 gap-6 pb-6 border-b border-border-subtle last:border-b-0 last:pb-0">
              {/* El número lleva al detalle del cheque. */}
              <div className="flex flex-col gap-1">
                <span className={labelCls}>N° de cheque</span>
                <button
                  type="button"
                  onClick={() => navigate(`/check/detail/${check.id}`)}
                  className="w-fit text-sm font-medium text-blue-lahuerta hover:underline"
                >
                  {check.numero}
                </button>
              </div>
              <Field label="Banco" value={check.banco_descripcion} />
              <Field label="Importe" value={formatCurrency(check.importe)} />
              <Field label="Fecha de emisión" value={formatDate(check.fecha_emision)} />
              <Field label="Fecha de depósito" value={formatDate(check.fecha_deposito)} />
              <CheckStateBadge state={check.estado} />
            </div>
          ))}
        </SectionCard>
      )}

      {/* Acciones: en desktop abajo a la derecha (Volver va arriba, en PageHeader; Anular está en el listado);
          en mobile a lo ancho, con Anular y Editar arriba y Volver abajo de todo. Un pago anulado no se
          edita ni se vuelve a anular. */}
      <div className="flex flex-col-reverse gap-3 pt-6 border-t border-border-subtle sm:flex-row sm:justify-end sm:gap-4">
        <div className="sm:hidden">
          <BackButton onClick={() => navigate('/client-payment')} className="w-full px-6 py-2.5 text-sm" />
        </div>
        {!cancelled && isMobile && (
          <DeleteButton onClick={() => setConfirmOpen(true)} label="Anular" icon={BlockIcon} />
        )}
        {!cancelled && (
          <EditButton onClick={() => navigate(`/client-payment/edit/${id}`)} label="Editar pago" />
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Anular pago"
        message={(
          <>
            <CancelClientPaymentMessage payment={payment} />
            <ReasonField
              value={reason}
              onChange={setReason}
              label="Motivo de la anulación"
              placeholder="Ej.: lo pagó otro cliente, se cargó dos veces…"
            />
          </>
        )}
        confirmLabel={<><BlockIcon sx={{ fontSize: 16 }} /> Anular</>}
        confirmDisabled={!reason.trim()}
        onConfirm={handleCancel}
        onCancel={closeConfirm}
      />

    </div>
  );
};

export default ClientPaymentDetail;
