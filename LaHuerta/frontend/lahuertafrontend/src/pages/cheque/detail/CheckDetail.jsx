import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { checkUrl } from '../../../constants/urls';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const STATE_CONFIG = {
  'EN_CARTERA': { label: 'En cartera',  bg: '#e8f0fb', color: '#4a7bc4' },
  'DEPOSITADO': { label: 'Depositado',  bg: '#fef9c3', color: '#a16207' },
  'ACREDITADO': { label: 'Acreditado', bg: '#dcfce7', color: '#166534' },
  'ENDOSADO':   { label: 'Endosado',   bg: '#f3e8ff', color: '#7e22ce' },
  'RECHAZADO':  { label: 'Rechazado',  bg: '#ffebee', color: '#c62828' },
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

const CheckDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCheck = async () => {
      try {
        const response = await axios.get(`${checkUrl}${id}/`);
        setCheck(response.data);
      } catch (err) {
        console.error('Error cargando cheque:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCheck();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !check) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el cheque.</p>
        <button
          onClick={() => navigate('/check')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const estadoDesc = check.estado?.descripcion || '';
  const stateCfg = STATE_CONFIG[estadoDesc] || { label: estadoDesc || '—', bg: '#f0f4f7', color: '#596064' };
  const isOverdue = estadoDesc === 'EN_CARTERA' && check.fecha_deposito && new Date(check.fecha_deposito) < new Date();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/check')}>Cheques</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">N° {check.numero}</span>
      </nav>

      {/* 1. Datos del cheque */}
      <SectionCard icon={<ReceiptIcon sx={{ fontSize: 20 }} />} title="Datos del Cheque">
        <Field label="Número" value={check.numero} />
        <Field label="Banco" value={check.banco?.descripcion} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(check.importe)}</span>
        </div>
        <Field label="Endosado" value={check.endosado ? 'Sí' : 'No'} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Estado</span>
          <span style={{
            display: 'inline-flex',
            width: 'fit-content',
            padding: '2px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            lineHeight: '18px',
            backgroundColor: stateCfg.bg,
            color: stateCfg.color,
            whiteSpace: 'nowrap',
          }}>
            {stateCfg.label}
          </span>
        </div>
      </SectionCard>

      {/* 2. Fechas */}
      <SectionCard icon={<CalendarTodayIcon sx={{ fontSize: 20 }} />} title="Fechas" cols={3}>
        <Field label="Fecha de emisión" value={formatDate(check.fecha_emision)} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Fecha de depósito</span>
          <span className={`text-sm ${isOverdue ? 'text-red-500 font-semibold' : 'text-on-surface'}`}>
            {check.fecha_deposito ? formatDate(check.fecha_deposito) : '—'}
            {isOverdue && <span className="ml-2 text-xs font-normal text-red-400">Vencida</span>}
          </span>
        </div>
        {check.endosado && (
          <Field label="Fecha de endoso" value={formatDate(check.fecha_endoso)} />
        )}
      </SectionCard>

      {/* Action Bar */}
      <div className="flex items-center justify-end pt-6 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => navigate('/check')}
          className="px-5 py-2.5 rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center gap-2"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
        </button>
      </div>

    </div>
  );
};

export default CheckDetail;
