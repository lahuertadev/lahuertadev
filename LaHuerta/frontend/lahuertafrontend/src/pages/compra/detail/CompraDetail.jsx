import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { buyUrl } from '../../../constants/urls';
import { HOME, PROVEEDORES } from '../../../constants/breadcrumbs';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import BusinessIcon from '@mui/icons-material/Business';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const PAYMENT_STATUS_CONFIG = {
  'PENDIENTE': { label: 'Pendiente', bg: '#ffebee', color: '#c62828' },
  'PARCIAL':   { label: 'Parcial',   bg: '#fef9c3', color: '#a16207' },
  'ABONADO':   { label: 'Abonado',   bg: '#dcfce7', color: '#166534' },
};

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

  const handleDelete = async () => {
    await axios.delete(`${buyUrl}${id}/`);
    navigate('/buy');
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
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar la compra.</p>
        <button
          onClick={() => navigate('/buy')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-blue-lahuerta transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const statusCfg = PAYMENT_STATUS_CONFIG[compra.payment_status] || { label: compra.payment_status || '—', bg: '#f0f4f7', color: '#596064' };
  const number = String(compra.id).padStart(8, '0');

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm font-medium text-on-surface-muted">
        <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate(HOME.path)}>{HOME.label}</span>
        <span className="text-xs">›</span>
        <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate(PROVEEDORES.path)}>{PROVEEDORES.label}</span>
        <span className="text-xs">›</span>
        <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/buy')}>Compras</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">N° {number}</span>
      </nav>

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
          <span style={{
            display: 'inline-flex',
            width: 'fit-content',
            padding: '2px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            lineHeight: '18px',
            backgroundColor: statusCfg.bg,
            color: statusCfg.color,
          }}>
            {statusCfg.label}
          </span>
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
                onClick={() => navigate(`/buy/edit/${id}`)}
                className="flex-1 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center justify-center gap-2"
              >
                <EditIcon sx={{ fontSize: 16 }} /> Editar
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/buy')}
              className="w-full py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center justify-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/buy')}
              className="px-5 py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
            <button
              type="button"
              onClick={() => navigate(`/buy/edit/${id}`)}
              className="px-5 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center gap-2"
            >
              <EditIcon sx={{ fontSize: 16 }} /> Editar compra
            </button>
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar compra"
        message={`¿Estás seguro que querés eliminar la compra N° ${number} de ${compra?.proveedor?.nombre}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default CompraDetail;
