import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ownCheckUrl } from '../../../constants/urls';
import { HOME, PROVEEDORES } from '../../../constants/breadcrumbs';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import Toast from '../../../components/Toast';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const STATE_CONFIG = {
  'EMITIDO': { label: 'Emitido', bg: '#e8f0fb', color: '#4a7bc4' },
  'COBRADO': { label: 'Cobrado', bg: '#dcfce7', color: '#166534' },
  'ANULADO': { label: 'Anulado', bg: '#ffebee', color: '#c62828' },
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

const OwnCheckDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '' });
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const fetchCheck = async () => {
    try {
      const response = await axios.get(`${ownCheckUrl}${id}/`);
      setCheck(response.data);
    } catch (err) {
      console.error('Error cargando cheque emitido:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchCheck(); }, [id]);

  const handleStateChange = async (action) => {
    try {
      await axios.post(`${ownCheckUrl}${id}/${action}/`);
      await fetchCheck();
    } catch (err) {
      const msg = err?.response?.data?.detail || `Error al ${action === 'cash' ? 'cobrar' : 'anular'} el cheque.`;
      setToast({ open: true, message: msg });
    }
  };

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
          onClick={() => navigate('/own-check')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const stateCfg = STATE_CONFIG[check.estado] || { label: check.estado || '—', bg: '#f0f4f7', color: '#596064' };
  const isEmitido = check.estado === 'EMITIDO';
  const isOverdue = isEmitido && check.fecha_vencimiento && new Date(check.fecha_vencimiento) < new Date();
  const isWaitingDeposit = isEmitido && check.fecha_deposito && new Date(check.fecha_deposito) > new Date();
  const isReadyToDeposit = isEmitido && check.fecha_deposito && new Date(check.fecha_deposito) <= new Date();
  const hasNoPurchases = !check.purchases || check.purchases.length === 0;
  const cashDisabledReason = hasNoPurchases
    ? 'No se puede cobrar un cheque que no está asociado a ningún pago.'
    : isWaitingDeposit
    ? 'No se puede cobrar antes de la fecha de depósito.'
    : '';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} />

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(HOME.path)}>{HOME.label}</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(PROVEEDORES.path)}>{PROVEEDORES.label}</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/own-check')}>Cheques emitidos</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap text-on-surface font-semibold">N° {check.numero}</span>
      </nav>

      {/* 1. Datos del Cheque */}
      <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Datos del Cheque">
        <Field label="N° de cheque" value={check.numero} />
        <Field label="Banco" value={check.banco?.descripcion} />
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
          }}>
            {stateCfg.label}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(check.importe)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1">
            <span className={labelCls}>Saldo restante</span>
            <Tooltip title="Importe del cheque menos los pagos de compras ya aplicados." placement="top" arrow>
              <InfoOutlinedIcon sx={{ fontSize: 13, color: '#acb3b7', cursor: 'default', mb: '6px' }} />
            </Tooltip>
          </span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(check.remaining_balance)}</span>
        </div>
        {check.observaciones && (
          <div className="md:col-span-3 flex flex-col gap-1">
            <span className={labelCls}>Observaciones</span>
            <span className="text-sm text-on-surface">{check.observaciones}</span>
          </div>
        )}
      </SectionCard>

      {/* 2. Fechas */}
      <SectionCard icon={<CalendarTodayIcon sx={{ fontSize: 20 }} />} title="Fechas" cols={3}>
        <Field label="Fecha de emisión" value={formatDate(check.fecha_emision)} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Fecha de depósito</span>
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isWaitingDeposit ? 'text-amber-600' : 'text-on-surface'}`}>
            {check.fecha_deposito ? formatDate(check.fecha_deposito) : '—'}
            {isWaitingDeposit && (
              <Tooltip title="Todavía no puede depositarse: la fecha de pago es posterior a hoy." placement="top" arrow>
                <InfoOutlinedIcon sx={{ fontSize: 15, color: '#d97706' }} />
              </Tooltip>
            )}
            {isReadyToDeposit && (
              <Tooltip title="La fecha de pago ya llegó: el cheque puede depositarse." placement="top" arrow>
                <span style={{
                  display: 'inline-block',
                  padding: '1px 8px',
                  borderRadius: '6px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                }}>
                  Disponible
                </span>
              </Tooltip>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Válido hasta</span>
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isOverdue ? 'text-red-500' : 'text-on-surface'}`}>
            {formatDate(check.fecha_vencimiento)}
            {isOverdue && (
              <Tooltip title="Este cheque venció y sigue en estado Emitido. Verificá si fue cobrado o anulá el registro." placement="top" arrow>
                <WarningAmberIcon sx={{ fontSize: 15, color: '#ef4444' }} />
              </Tooltip>
            )}
          </span>
        </div>
      </SectionCard>

      {/* 3. Proveedor / Compras */}
      <SectionCard icon={<LocalShippingOutlinedIcon sx={{ fontSize: 20 }} />} title="Proveedor" cols={2}>
        {check.supplier_name ? (
          <>
            <Field label="Nombre" value={check.supplier_name} />
            {check.purchases?.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className={labelCls}>Compras asociadas</span>
                <div className="flex flex-wrap gap-2">
                  {check.purchases.map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => navigate(`/buy/detail/${pid}`)}
                      className="text-sm text-blue-lahuerta hover:underline font-medium"
                    >
                      #{String(pid).padStart(8, '0')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <span className="md:col-span-2 text-sm text-on-surface-muted">Todavía no se encuentra asociado a ningún pago.</span>
        )}
      </SectionCard>

      {/* Action Bar */}
      <div className="pt-6 border-t border-border-subtle">
        {isMobile ? (
          <div className="flex flex-col gap-3">
            {isEmitido && (
              <div className="flex gap-3">
                <Tooltip title={cashDisabledReason} placement="top" arrow>
                  <span className="flex-1">
                    <button
                      type="button"
                      onClick={() => handleStateChange('cash')}
                      disabled={Boolean(cashDisabledReason)}
                      className="w-full py-2.5 rounded-lg border border-green-300 text-green-600 text-sm font-semibold hover:bg-green-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      Cobrar
                    </button>
                  </span>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => setCancelConfirm(true)}
                  className="flex-1 py-2.5 rounded-lg border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  Anular
                </button>
              </div>
            )}
            {isEmitido && (
              <button
                type="button"
                onClick={() => navigate(`/own-check/edit/${id}`)}
                className="w-full py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center justify-center gap-2"
              >
                <EditIcon sx={{ fontSize: 16 }} /> Editar
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/own-check')}
              className="w-full py-2.5 rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/own-check')}
              className="px-5 py-2.5 rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
            {isEmitido && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/own-check/edit/${id}`)}
                  className="px-5 py-2.5 rounded-lg border border-border-subtle text-sm font-semibold text-on-surface-muted hover:bg-surface-low transition-colors flex items-center gap-2"
                >
                  <EditIcon sx={{ fontSize: 16 }} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => setCancelConfirm(true)}
                  className="px-5 py-2.5 rounded-lg border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  Anular
                </button>
                <Tooltip title={cashDisabledReason} placement="top" arrow>
                  <span>
                    <button
                      type="button"
                      onClick={() => handleStateChange('cash')}
                      disabled={Boolean(cashDisabledReason)}
                      className="px-5 py-2.5 rounded-lg border border-green-300 text-green-600 text-sm font-semibold hover:bg-green-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      Cobrar
                    </button>
                  </span>
                </Tooltip>
              </>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={cancelConfirm}
        title={hasNoPurchases ? 'Anular cheque sin compras asociadas' : 'Anular cheque con compras asociadas'}
        message={
          hasNoPurchases
            ? <>Este cheque no tiene compras asociadas. ¿Estás seguro que querés anularlo? Una vez anulado quedará el registro y <strong>no podrá ser editado ni eliminado</strong>.</>
            : <>Este cheque tiene compras asociadas. Al anularlo, <strong>los pagos serán eliminados, la cuenta corriente del proveedor será restaurada y las compras volverán a su estado anterior</strong>. ¿Estás seguro que querés continuar?</>
        }
        onConfirm={() => { setCancelConfirm(false); handleStateChange('cancel'); }}
        onCancel={() => setCancelConfirm(false)}
      />

    </div>
  );
};

export default OwnCheckDetail;
