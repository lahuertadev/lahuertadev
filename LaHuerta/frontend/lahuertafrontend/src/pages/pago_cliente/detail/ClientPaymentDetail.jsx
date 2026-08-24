import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { clientPaymentUrl } from '../../../constants/urls';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import PersonIcon from '@mui/icons-material/PersonOutline';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCardOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
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

const ClientPaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`${clientPaymentUrl}${id}/`);
    navigate('/client-payment');
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
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/client-payment')}>Pagos de Clientes</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">{payment.cliente.razon_social}</span>
      </nav>

      {/* 1. Cliente */}
      <SectionCard icon={<PersonIcon sx={{ fontSize: 20 }} />} title="Cliente" cols={1}>
        <Field label="Razón Social" value={payment.cliente.razon_social} />
      </SectionCard>

      {/* 2. Datos del pago */}
      <SectionCard icon={<PaymentsIcon sx={{ fontSize: 20 }} />} title="Datos del Pago">
        <Field label="Fecha" value={formatDate(payment.fecha_pago)} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(payment.importe)}</span>
        </div>
        <Field label="Tipo de pago" value={payment.tipo_pago.descripcion} />
        {payment.observaciones && (
          <div className="md:col-span-3 flex flex-col gap-1">
            <span className={labelCls}>Observaciones</span>
            <span className="text-sm text-on-surface">{payment.observaciones}</span>
          </div>
        )}
      </SectionCard>

      {/* 3. Datos del cheque (si aplica) */}
      {payment.cheque && (
        <SectionCard icon={<CreditCardIcon sx={{ fontSize: 20 }} />} title="Datos del Cheque" cols={3}>
          <Field label="N° de cheque" value={payment.cheque.numero} />
          <Field label="Fecha de emisión" value={formatDate(payment.cheque.fecha_emision)} />
          <Field label="Fecha de depósito" value={formatDate(payment.cheque.fecha_deposito)} />
        </SectionCard>
      )}

      {/* Action Bar */}
      <div className="pt-6 border-t border-border-subtle">
        {isMobile ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex-1 py-2.5 rounded-lg border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <DeleteIcon sx={{ fontSize: 16 }} /> Eliminar
              </button>
              <button
                type="button"
                onClick={() => navigate(`/client-payment/edit/${id}`)}
                className="flex-1 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center justify-center gap-2"
              >
                <EditIcon sx={{ fontSize: 16 }} /> Editar pago
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/client-payment')}
              className="w-full py-2.5 rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/client-payment')}
              className="px-5 py-2.5 rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
            <button
              type="button"
              onClick={() => navigate(`/client-payment/edit/${id}`)}
              className="px-5 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center gap-2"
            >
              <EditIcon sx={{ fontSize: 16 }} /> Editar pago
            </button>
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar pago"
        message={`¿Estás seguro que querés eliminar este pago de ${payment?.cliente?.razon_social}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default ClientPaymentDetail;
