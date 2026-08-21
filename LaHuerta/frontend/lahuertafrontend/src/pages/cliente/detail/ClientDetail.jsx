import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { clientUrl } from '../../../constants/urls';
import { getActiveBadgeStyle } from '../../../constants/statusBadge';
import { formatCuit } from '../../../utils/cuit';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOnOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserOutlined';
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

const formatTelefono = (raw = '') => {
  const digits = String(raw).replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`${clientUrl}${id}/`);
    navigate('/client');
  };

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await axios.get(`${clientUrl}${id}/`);
        setClient(response.data);
      } catch (err) {
        console.error('Error cargando cliente:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchClient();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el cliente.</p>
        <button
          onClick={() => navigate('/client')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-blue-lahuerta transition-colors"
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
        <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/client')}>Clientes</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">{client.razon_social}</span>
      </nav>

      {/* 1. Datos de la Empresa */}
      <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Datos de la Empresa">
        <Field label="CUIT" value={formatCuit(client.cuit)} />
        <Field label="Razón Social" value={client.razon_social} />
        <Field label="Nombre Fantasía" value={client.nombre_fantasia} />
      </SectionCard>

      {/* 2. Datos de Dirección */}
      <SectionCard icon={<LocationOnIcon sx={{ fontSize: 20 }} />} title="Datos de Dirección">
        <Field label="Provincia" value={client.localidad?.municipio?.provincia?.nombre} />
        <Field label="Municipio" value={client.localidad?.municipio?.nombre} />
        <Field label="Localidad" value={client.localidad?.nombre} />
        <Field label="Dirección" value={client.domicilio} />
      </SectionCard>

      {/* 3. Facturación */}
      <SectionCard icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />} title="Facturación">
        <Field label="Condición IVA" value={client.condicion_IVA?.descripcion} />
        <Field label="Lista de Precios" value={client.lista_precios?.nombre} />
      </SectionCard>

      {/* 4. Cuenta Corriente */}
      <SectionCard icon={<AccountBalanceWalletIcon sx={{ fontSize: 20 }} />} title="Cuenta Corriente" cols={2}>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Saldo</span>
          <span className={`text-sm font-semibold ${parseFloat(client.cuenta_corriente) < 0 ? 'text-green-600' : parseFloat(client.cuenta_corriente) > 0 ? 'text-red-500' : 'text-on-surface'}`}>
            {formatCurrency(client.cuenta_corriente)}
          </span>
          <p className="mt-1 text-xs text-on-surface-muted">Positivo: el cliente tiene deuda. Negativo: el cliente tiene saldo a favor.</p>
        </div>
      </SectionCard>

      {/* 5. Fecha de Inicio de Ventas */}
      <SectionCard icon={<CalendarTodayIcon sx={{ fontSize: 20 }} />} title="Fecha de inicio de ventas" cols={2}>
        <Field label="Fecha de inicio" value={formatDate(client.fecha_inicio_ventas)} />
      </SectionCard>

      {/* 6. Contacto */}
      <SectionCard icon={<PhoneIcon sx={{ fontSize: 20 }} />} title="Contacto">
        <Field label="Teléfono" value={formatTelefono(client.telefono)} />
      </SectionCard>

      {/* 7. Estado */}
      <SectionCard icon={<VerifiedUserIcon sx={{ fontSize: 20 }} />} title="Estado" cols={2}>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Estado del cliente</span>
          <span style={{ ...getActiveBadgeStyle(client.estado), display: 'inline-flex', width: 'fit-content' }}>
            {client.estado ? 'Activo' : 'Inactivo'}
          </span>
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
                onClick={() => navigate(`/client/edit/${id}`)}
                className="flex-1 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center justify-center gap-2"
              >
                <EditIcon sx={{ fontSize: 16 }} /> Editar cliente
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/client')}
              className="w-full py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center justify-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/client')}
              className="px-5 py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
            <button
              type="button"
              onClick={() => navigate(`/client/edit/${id}`)}
              className="px-5 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center gap-2"
            >
              <EditIcon sx={{ fontSize: 16 }} /> Editar cliente
            </button>
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar cliente"
        message={`¿Estás seguro que querés eliminar a ${client?.razon_social}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default ClientDetail;
