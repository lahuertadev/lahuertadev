import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { supplierUrl } from '../../../constants/urls';
import { formatCurrency } from '../../../utils/currency';
import AlertDialog from '../../../components/DialogAlert';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`${supplierUrl}${id}/`);
    navigate('/supplier');
  };

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await axios.get(`${supplierUrl}${id}/`);
        setSupplier(response.data);
      } catch (err) {
        console.error('Error cargando proveedor:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSupplier();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el proveedor.</p>
        <button
          onClick={() => navigate('/supplier')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-blue-lahuerta transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const cc = parseFloat(supplier.cuenta_corriente) || 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/supplier')}>Proveedores</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">{supplier.nombre}</span>
      </nav>

      {/* 1. Datos del proveedor */}
      <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Datos del Proveedor">
        <Field label="Nombre" value={supplier.nombre} />
        <Field label="Nombre Fantasía" value={supplier.nombre_fantasia} />
        <Field label="Teléfono" value={supplier.telefono} />
      </SectionCard>

      {/* 2. Ubicación */}
      <SectionCard icon={<LocationOnIcon sx={{ fontSize: 20 }} />} title="Ubicación">
        <Field label="Mercado" value={supplier.mercado?.descripcion} />
        <Field label="Puesto" value={supplier.puesto} />
        <Field label="Nave" value={supplier.nave} />
      </SectionCard>

      {/* 3. Cuenta corriente */}
      <SectionCard icon={<AccountBalanceWalletIcon sx={{ fontSize: 20 }} />} title="Cuenta Corriente" cols={1}>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Saldo</span>
          <span className={`text-sm font-semibold ${cc > 0 ? 'text-red-500' : cc < 0 ? 'text-green-600' : 'text-on-surface'}`}>
            {formatCurrency(supplier.cuenta_corriente)}
          </span>
          <p className="mt-1 text-xs text-on-surface-muted">Positivo: La Huerta le debe al proveedor. Negativo: el proveedor tiene saldo a favor de La Huerta.</p>
        </div>
      </SectionCard>

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
                onClick={() => navigate(`/supplier/edit/${id}`)}
                className="flex-1 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center justify-center gap-2"
              >
                <EditIcon sx={{ fontSize: 16 }} /> Editar
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/supplier')}
              className="w-full py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center justify-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/supplier')}
              className="px-5 py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
            <button
              type="button"
              onClick={() => navigate(`/supplier/edit/${id}`)}
              className="px-5 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center gap-2"
            >
              <EditIcon sx={{ fontSize: 16 }} /> Editar proveedor
            </button>
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar proveedor"
        message={`¿Estás seguro que querés eliminar a ${supplier?.nombre}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default SupplierDetail;
