import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { purchasePaymentUrl } from '../../../constants/urls';
import { HOME, PROVEEDORES } from '../../../constants/breadcrumbs';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCardOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
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

const PAYMENT_TYPE_CONFIG = {
  'Efectivo':      { bg: '#dcfce7', color: '#166534' },
  'Cheque':        { bg: '#e8f0fb', color: '#4a7bc4' },
  'Cheque Propio': { bg: '#f3e8ff', color: '#7c3aed' },
};

const PurchasePaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
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
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-blue-lahuerta transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const canDelete = !payment.cheque;
  const proveedorNombre = payment.compra?.proveedor || '—';
  const typeCfg = PAYMENT_TYPE_CONFIG[payment.tipo_pago?.descripcion] || { bg: '#f0f4f7', color: '#596064' };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate(HOME.path)}>{HOME.label}</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate(PROVEEDORES.path)}>{PROVEEDORES.label}</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/purchase-payment')}>Pagos de Compras</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">{proveedorNombre}</span>
      </nav>

      {/* 1. Proveedor */}
      <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Proveedor" cols={2}>
        <Field label="Nombre" value={proveedorNombre} />
        <Field label="Fecha de compra" value={formatDate(payment.compra?.fecha)} />
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

      {/* 3. Datos del Cheque */}
      {payment.cheque && (
        <SectionCard icon={<CreditCardIcon sx={{ fontSize: 20 }} />} title="Cheque">
          <Field label="N° de cheque" value={payment.cheque.numero} />
          <Field label="Banco" value={payment.cheque.banco} />
          <Field label="Importe" value={formatCurrency(payment.cheque.importe)} />
          <Field label="Estado" value={payment.cheque.estado} />
        </SectionCard>
      )}

      {/* 4. Datos del Cheque Propio */}
      {payment.cheque_propio && (
        <SectionCard icon={<CreditCardIcon sx={{ fontSize: 20 }} />} title="Cheque Propio">
          <Field label="N° de cheque" value={payment.cheque_propio.numero} />
          <Field label="Banco" value={payment.cheque_propio.banco} />
          <Field label="Importe" value={formatCurrency(payment.cheque_propio.importe)} />
          <Field label="Estado" value={payment.cheque_propio.estado} />
        </SectionCard>
      )}

      {/* Action Bar */}
      <div className="pt-6 border-t border-border-subtle">
        {isMobile ? (
          <div className="flex flex-col gap-3">
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="w-full py-2.5 rounded-lg border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <DeleteIcon sx={{ fontSize: 16 }} /> Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/purchase-payment')}
              className="w-full py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center justify-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/purchase-payment')}
              className="px-5 py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="px-5 py-2.5 rounded-lg border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <DeleteIcon sx={{ fontSize: 16 }} /> Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar pago"
        message={`¿Estás seguro que querés eliminar este pago de ${proveedorNombre}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default PurchasePaymentDetail;
