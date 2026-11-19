import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { buyUrl } from '../../../constants/urls';
import { HOME, PROVEEDORES } from '../../../constants/breadcrumbs';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import Toast from '../../../components/Toast';
import { useToast } from '../../../context/ToastContext';
import DeleteBuyMessage from '../shared/DeleteBuyMessage';
import BackButton from '../../../components/BackButton';
import DeleteButton from '../../../components/DeleteButton';
import EditButton from '../../../components/EditButton';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import { CancelledBadge, FallenCheckBadge } from '../../pago_compra/shared/OnAccountBadge';
import { isCancelledPayment, hasFallenCheck } from '../../../constants/purchasePaymentTypes';
import { BADGE_COLORS } from '../../../constants/badgeColors';
import Badge from '../../../components/Badge';
import { PAYMENT_STATUS_CONFIG } from '../../../constants/grid/Compra';


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

const CompraDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [compra, setCompra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '' });
  const { showToast } = useToast();

  // Si un pago cubre la compra, el backend no la deja eliminar y explica por qué.
  const handleDelete = async () => {
    try {
      await axios.delete(`${buyUrl}${id}/`);
      showToast('La compra se eliminó correctamente.');
      navigate('/buy');
    } catch (err) {
      console.error('Error eliminando la compra:', err);
      setToast({ open: true, message: err?.response?.data?.detail || 'Error al eliminar la compra.' });
    } finally {
      setConfirmOpen(false);
    }
  };

  useEffect(() => {
    const fetchCompra = async () => {
      try {
        const response = await axios.get(`${buyUrl}${id}/`);
        setCompra(response.data);
      } catch (err) {
        console.error('Error cargando compra:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCompra();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !compra) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar la compra.</p>
        <button
          onClick={() => navigate('/buy')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const statusCfg = PAYMENT_STATUS_CONFIG[compra.payment_status] || { label: compra.payment_status || '—', ...BADGE_COLORS.gray };
  const number = String(compra.id).padStart(8, '0');

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs + Volver */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
          <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(HOME.path)}>{HOME.label}</span>
          <span className="text-xs">›</span>
          <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(PROVEEDORES.path)}>{PROVEEDORES.label}</span>
          <span className="text-xs">›</span>
          <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/buy')}>Compras</span>
          <span className="text-xs">›</span>
          <span className="text-on-surface font-semibold">N° {number}</span>
        </nav>
        <BackButton onClick={() => navigate('/buy')} className="shrink-0 px-5 py-2.5 text-sm" />
      </div>

      {/* 1. Datos generales */}
      <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Datos de la Compra">
        <Field label="N° Compra" value={number} />
        <Field label="Fecha" value={formatDate(compra.fecha)} />
        <Field label="Proveedor" value={compra.proveedor?.nombre} />
      </SectionCard>

      {/* 2. Importes */}
      <SectionCard icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />} title="Importes">
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe total</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(compra.importe)}</span>
        </div>
        <Field label="Seña" value={formatCurrency(compra.senia)} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Saldo pendiente</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(compra.outstanding_balance)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Estado de pago</span>
          <Badge color={statusCfg} label={statusCfg.label} />
        </div>
      </SectionCard>

      {/* 3. Productos */}
      {compra.items?.length > 0 && (
        <SectionCard icon={<ShoppingCartIcon sx={{ fontSize: 20 }} />} title="Productos" cols={1}>
          <div className="space-y-3">
            {compra.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                <div>
                  <p className="text-sm font-medium text-on-surface">{item.producto?.descripcion}</p>
                  <p className="text-xs text-on-surface-muted">
                    {item.cantidad_producto} u. × {formatCurrency(item.precio_bulto)}
                    {item.tipo_venta?.descripcion && ` — ${item.tipo_venta.descripcion}`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-on-surface">
                  {formatCurrency(item.cantidad_producto * item.precio_bulto)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 4. Pagos que cubren la compra (un pago puede cubrir varias compras: se muestra lo aplicado a esta).
          Los anulados se listan como registro, tachados: no cuentan para lo pagado. Si se cayó un cheque del
          pago (que sigue vigente), se avisa con la etiqueta del cheque. */}
      <SectionCard icon={<PaymentsIcon sx={{ fontSize: 20 }} />} title="Pagos" cols={1}>
        {compra.payments?.length > 0 ? (
          <div className="space-y-3">
            {compra.payments.map((payment) => (
              <div
                key={payment.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/purchase-payment/detail/${payment.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/purchase-payment/detail/${payment.id}`); }}
                className="flex flex-col gap-1 py-2 border-b border-border-subtle last:border-0 cursor-pointer hover:bg-surface-low transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-blue-lahuerta">
                    Pago N° {String(payment.id).padStart(8, '0')}
                    {isCancelledPayment(payment) && <CancelledBadge />}
                    {hasFallenCheck(payment) && <FallenCheckBadge state={payment.fallen_check} />}
                  </p>
                  <p className="text-xs text-on-surface-muted">{formatDate(payment.fecha_pago)} · {payment.tipo_pago}</p>
                </div>
                <div className="sm:text-right">
                  <p className={`text-sm font-semibold ${isCancelledPayment(payment) ? 'text-on-surface-muted line-through' : 'text-on-surface'}`}>
                    {formatCurrency(payment.importe_aplicado)}
                  </p>
                  {parseFloat(payment.importe_aplicado) !== parseFloat(payment.importe_abonado) && (
                    <p className="text-xs text-on-surface-muted">de un pago de {formatCurrency(payment.importe_abonado)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-on-surface-muted">Todavía no tiene pagos.</span>
        )}
      </SectionCard>

      {/* Action Bar: en mobile también se puede eliminar (no hay columna de acciones en el listado). */}
      <div className="flex flex-col-reverse gap-3 pt-6 border-t border-border-subtle sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        {isMobile && (
          <DeleteButton onClick={() => setConfirmOpen(true)} />
        )}
        <EditButton onClick={() => navigate(`/buy/edit/${id}`)} label="Editar compra" />
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar compra"
        message={<DeleteBuyMessage buy={compra} />}
        confirmLabel="Eliminar compra"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} duration={8000} />

    </div>
  );
};

export default CompraDetail;
