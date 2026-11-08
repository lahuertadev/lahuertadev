import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { purchasePaymentUrl } from '../../../constants/urls';
import { HOME, PROVEEDORES } from '../../../constants/breadcrumbs';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import Tooltip from '@mui/material/Tooltip';
import BackButton from '../../../components/BackButton';
import SpotlightButton from '../../../components/SpotlightButton';
import { CHECK_STATE_CONFIG } from '../../../constants/grid/Check';
import { OWN_CHECK_STATE_CONFIG } from '../../../constants/grid/OwnCheck';
import OnAccountBadge from '../shared/OnAccountBadge';
import DeletePaymentMessage from '../shared/DeletePaymentMessage';
import { formatBuyNumber } from '../../../constants/purchasePaymentTypes';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCardOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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
  const cfg = config[state] || { label: state, bg: '#f0f4f7', color: '#596064' };
  return (
    <div className="flex flex-col gap-1">
      <span className={labelCls}>Estado</span>
      <span
        className="inline-flex w-fit items-center rounded-md px-2.5 py-0.5 text-xs leading-[18px] font-semibold"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        {cfg.label || '—'}
      </span>
    </div>
  );
};

const PAYMENT_TYPE_CONFIG = {
  'Efectivo':      { bg: '#dcfce7', color: '#166534' },
  'Cheque':        { bg: '#e8f0fb', color: '#4a7bc4' },
  'Cheque Propio': { bg: '#f3e8ff', color: '#7c3aed' },
};

const PurchasePaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`${purchasePaymentUrl}${id}/`);
    navigate('/purchase-payment');
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
  const typeCfg = PAYMENT_TYPE_CONFIG[payment.tipo_pago?.descripcion] || { bg: '#f0f4f7', color: '#596064' };

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

      {/* 1. Proveedor */}
      <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Proveedor">
        <Field label="Nombre" value={supplierName} />
        <Field label="Puesto" value={payment.proveedor?.puesto} />
        {payment.compra ? (
          <Field
            label="Compra"
            value={`N° ${formatBuyNumber(payment.compra.id)} · ${formatDate(payment.compra.fecha)}`}
          />
        ) : (
          <div className="flex flex-col gap-1">
            <span className={labelCls}>Compra</span>
            <OnAccountBadge />
          </div>
        )}
      </SectionCard>

      {/* 2. Datos del Pago */}
      <SectionCard icon={<PaymentsIcon sx={{ fontSize: 20 }} />} title="Datos del Pago">
        <Field label="Fecha de pago" value={formatDate(payment.fecha_pago)} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(payment.importe_abonado)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Tipo de pago</span>
          <span style={{
            display: 'inline-flex',
            width: 'fit-content',
            padding: '2px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            lineHeight: '18px',
            backgroundColor: typeCfg.bg,
            color: typeCfg.color,
          }}>
            {payment.tipo_pago?.descripcion || '—'}
          </span>
        </div>
      </SectionCard>

      {/* 3. Cheques de clientes endosados en el pago */}
      {payment.cheques?.length > 0 && (
        <SectionCard icon={<CreditCardIcon sx={{ fontSize: 20 }} />} title={payment.cheques.length > 1 ? `Cheques (${payment.cheques.length})` : 'Cheque'} cols={1}>
          {payment.cheques.map((check) => (
            <div key={check.id} className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-border-subtle last:border-b-0 last:pb-0">
              <Field label="N° de cheque" value={check.numero} />
              <Field label="Banco" value={check.banco} />
              <Field label="Importe" value={formatCurrency(check.importe)} />
              <CheckStateBadge state={check.estado} config={CHECK_STATE_CONFIG} />
            </div>
          ))}
        </SectionCard>
      )}

      {/* 4. Cheques emitidos usados en el pago, con cuánto se usó de cada uno */}
      {payment.cheques_propios?.length > 0 && (
        <SectionCard
          icon={<CreditCardIcon sx={{ fontSize: 20 }} />}
          title={payment.cheques_propios.length > 1 ? `Cheques propios (${payment.cheques_propios.length})` : 'Cheque propio'}
          cols={1}
        >
          {payment.cheques_propios.map((ownCheck) => (
            <div key={ownCheck.id} className="grid grid-cols-2 md:grid-cols-5 gap-6 pb-6 border-b border-border-subtle last:border-b-0 last:pb-0">
              <Field label="N° de cheque" value={ownCheck.numero} />
              <Field label="Banco" value={ownCheck.banco} />
              <Field label="Importe del cheque" value={formatCurrency(ownCheck.importe)} />
              <div className="flex flex-col gap-1">
                <span className={labelCls}>Usado en este pago</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-on-surface">{formatCurrency(ownCheck.importe_usado)}</span>
                  {parseFloat(ownCheck.importe_usado) < parseFloat(ownCheck.importe) && (
                    <Tooltip
                      title="En este pago se usó una parte del cheque. El resto puede estar en otros pagos a este proveedor, por eso el cheque puede aparecer en más de un pago."
                      placement="top"
                      arrow
                      enterTouchDelay={0}
                    >
                      <span
                        tabIndex={0}
                        className="inline-flex w-fit items-center rounded-md px-2.5 py-0.5 text-xs leading-[18px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 cursor-help"
                      >
                        Uso parcial
                      </span>
                    </Tooltip>
                  )}
                </span>
              </div>
              <CheckStateBadge state={ownCheck.estado} config={OWN_CHECK_STATE_CONFIG} />
            </div>
          ))}
        </SectionCard>
      )}

      {/* Acciones: mismo layout que FormActions (abajo a la derecha; en mobile apiladas a lo ancho, la principal arriba). */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 border-t border-border-subtle">
        <SpotlightButton variant="danger" onClick={() => setConfirmOpen(true)} className="w-full sm:w-auto px-6 py-2.5 text-sm">
          <DeleteIcon sx={{ fontSize: 16 }} /> Eliminar
        </SpotlightButton>
        <SpotlightButton
          variant="primary"
          onClick={() => navigate(`/purchase-payment/edit/${id}`)}
          className="w-full sm:w-auto sm:min-w-[10rem] px-6 py-2.5 text-sm"
        >
          <EditIcon sx={{ fontSize: 16 }} /> Editar pago
        </SpotlightButton>
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar pago"
        message={<DeletePaymentMessage payment={payment} supplierName={supplierName} />}
        confirmLabel={<><DeleteIcon sx={{ fontSize: 16 }} /> Eliminar</>}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default PurchasePaymentDetail;
