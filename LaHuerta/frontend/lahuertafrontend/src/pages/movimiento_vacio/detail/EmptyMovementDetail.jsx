import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { emptyMovementUrl } from '../../../constants/urls';
import { HOME, PROVEEDORES } from '../../../constants/breadcrumbs';
import { MovementTypeBadge } from '../../../constants/grid/MovimientoVacio';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { useToast } from '../../../context/ToastContext';
import AlertDialog from '../../../components/DialogAlert';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined';
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

const EmptyMovementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [movement, setMovement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`${emptyMovementUrl}${id}/`);
    showToast('Movimiento eliminado.');
    navigate('/empty-movement');
  };

  useEffect(() => {
    const fetchMovement = async () => {
      try {
        const response = await axios.get(`${emptyMovementUrl}${id}/`);
        setMovement(response.data);
      } catch (err) {
        console.error('Error cargando movimiento de vacíos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchMovement();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !movement) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el movimiento de vacíos.</p>
        <button
          onClick={() => navigate('/empty-movement')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const supplierName = movement.proveedor?.nombre || '—';

  const editButton = (className) => (
    <button
      type="button"
      onClick={() => navigate(`/empty-movement/edit/${id}`)}
      className={`${className} rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center justify-center gap-2`}
    >
      <EditIcon sx={{ fontSize: 16 }} /> Editar
    </button>
  );

  const deleteButton = (className) => (
    <button
      type="button"
      onClick={() => setConfirmOpen(true)}
      className={`${className} rounded-lg border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2`}
    >
      <DeleteIcon sx={{ fontSize: 16 }} /> Eliminar
    </button>
  );

  const backButton = (className) => (
    <button
      type="button"
      onClick={() => navigate('/empty-movement')}
      className={`${className} rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center justify-center gap-2`}
    >
      <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
    </button>
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(HOME.path)}>{HOME.label}</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(PROVEEDORES.path)}>{PROVEEDORES.label}</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/empty-movement')}>Vacíos</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">{supplierName}</span>
      </nav>

      {/* 1. Datos del movimiento */}
      <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Datos del movimiento">
        <Field label="Proveedor" value={supplierName} />
        <Field label="Fecha" value={formatDate(movement.fecha)} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Tipo</span>
          <MovementTypeBadge type={movement.tipo} />
        </div>
        <Field label="N° de comprobante" value={movement.nro_comprobante} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(movement.importe)}</span>
        </div>
      </SectionCard>

      {/* 2. Vacíos */}
      <SectionCard icon={<Inventory2Icon sx={{ fontSize: 20 }} />} title="Vacíos" cols={1}>
        <div className="space-y-3">
          {movement.contenedores.map((line) => (
            <div key={line.id} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
              <div>
                <p className="text-sm font-medium text-on-surface">{line.tipo_contenedor?.descripcion}</p>
                <p className="text-xs text-on-surface-muted">
                  {line.cantidad} u. × {formatCurrency(line.precio_unitario)}
                </p>
              </div>
              <p className="text-sm font-semibold text-on-surface">{formatCurrency(line.subtotal)}</p>
            </div>
          ))}
          <div className="flex items-center justify-end gap-4 pt-1">
            <span className="text-on-surface-muted text-sm">TOTAL</span>
            <span className="text-base font-bold text-on-surface">{formatCurrency(movement.importe)}</span>
          </div>
        </div>
      </SectionCard>

      {/* Action Bar */}
      <div className="pt-6 border-t border-border-subtle">
        {isMobile ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {deleteButton('flex-1 py-2.5')}
              {editButton('flex-1 py-2.5')}
            </div>
            {backButton('w-full py-2.5')}
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4">
            {backButton('px-5 py-2.5')}
            {deleteButton('px-5 py-2.5')}
            {editButton('px-5 py-2.5')}
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar movimiento"
        message={`¿Estás seguro que querés eliminar este movimiento de vacíos de ${supplierName}? Se revierte su efecto en la cuenta corriente del proveedor.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default EmptyMovementDetail;
