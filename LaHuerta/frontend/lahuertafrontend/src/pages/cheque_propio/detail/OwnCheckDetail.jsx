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
import { useToast } from '../../../context/ToastContext';
import OwnCheckSupplierPayments from './OwnCheckSupplierPayments';
import EditButton from '../../../components/EditButton';
import SpotlightButton from '../../../components/SpotlightButton';
import { OWN_CHECK_STATE_CONFIG } from '../../../constants/grid/OwnCheck';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AlertIcon from '../../../components/AlertIcon';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { BADGE_COLORS } from '../../../constants/badgeColors';
import Badge from '../../../components/Badge';
import BackButton from '../../../components/BackButton';
import PageHeader from '../../../components/PageHeader';
import {
  OWN_CHECK_ACTIONS, OWN_CHECK_ACTION_ERROR_VERBS, OWN_CHECK_ACTION_SUCCESS, canCancel, canCash, canReject, ownCheckConfirmation,
} from '../shared/ownCheckActions';

// Acciones de estado que se muestran en el detalle solo en mobile (en desktop están en el listado).
const MOBILE_ACTIONS = [
  { key: 'cash', isEnabled: canCash, variant: 'outline' },
  { key: 'reject', isEnabled: canReject, variant: 'warning' },
  { key: 'cancel', isEnabled: canCancel, variant: 'danger' },
];


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
  const { showToast } = useToast();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '' });
  const [confirmAction, setConfirmAction] = useState(null); // 'cancel' | 'reject'

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
      showToast(OWN_CHECK_ACTION_SUCCESS[action]);
      await fetchCheck();
    } catch (err) {
      const msg = err?.response?.data?.detail || `Error al ${OWN_CHECK_ACTION_ERROR_VERBS[action]} el cheque.`;
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
        <BackButton onClick={() => navigate('/own-check')} label="Volver al listado" />
      </div>
    );
  }

  const stateCfg = OWN_CHECK_STATE_CONFIG[check.estado] || { label: check.estado || '—', ...BADGE_COLORS.gray };
  const isEmitido = check.estado === 'EMITIDO';
  const isOverdue = isEmitido && check.fecha_vencimiento && new Date(check.fecha_vencimiento) < new Date();
  const isWaitingDeposit = isEmitido && check.fecha_deposito && new Date(check.fecha_deposito) > new Date();
  const isReadyToDeposit = isEmitido && check.fecha_deposito && new Date(check.fecha_deposito) <= new Date();
  const confirmation = confirmAction ? ownCheckConfirmation(confirmAction, check) : null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} />

      <PageHeader
        breadcrumbs={[
          HOME,
          PROVEEDORES,
          { label: 'Cheques emitidos', path: '/own-check' },
          { label: `N° ${check.numero}` },
        ]}
        onBack={() => navigate('/own-check')}
      />

      {/* 1. Datos del Cheque */}
      <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Datos del Cheque">
        <Field label="N° de cheque" value={check.numero} />
        <Field label="Banco" value={check.banco?.descripcion} />
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Estado</span>
          <Badge color={stateCfg} label={stateCfg.label} />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Importe</span>
          <span className="text-sm font-semibold text-on-surface">{formatCurrency(check.importe)}</span>
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
                  backgroundColor: BADGE_COLORS.green.bg,
                  color: BADGE_COLORS.green.color,
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
              <AlertIcon title="Este cheque venció y sigue en estado Emitido. Verificá si fue cobrado o anulá el registro." size={15} />
            )}
          </span>
        </div>
      </SectionCard>

      {/* 3. Proveedor y pagos */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="text-blue-lahuerta"><LocalShippingOutlinedIcon sx={{ fontSize: 20 }} /></span>
          <h2 className="text-base font-semibold text-on-surface">Proveedor y pagos</h2>
        </div>
        <OwnCheckSupplierPayments check={check} />
      </section>

      {/* Acciones. En desktop: solo Editar (Volver va arriba; Cobrar, Rechazar y Anular están en la
          columna Acción del listado). En mobile el listado no tiene esa columna, así que acá van
          Cobrar, Rechazar y Anular (grisadas con el motivo si no corresponden), Editar y Volver. */}
      <div className="flex flex-col-reverse gap-3 pt-6 border-t border-border-subtle sm:flex-row sm:justify-end sm:gap-4">
        <div className="sm:hidden">
          <BackButton onClick={() => navigate('/own-check')} className="w-full px-6 py-2.5 text-sm" />
        </div>
        {isMobile && MOBILE_ACTIONS.map(({ key, isEnabled, variant }) => {
          const { label, icon: ActionIcon, disabledReason } = OWN_CHECK_ACTIONS[key];
          const enabled = isEnabled(check);
          const reason = typeof disabledReason === 'function' ? disabledReason(check) : disabledReason;
          return (
            <Tooltip key={key} title={enabled ? '' : reason} arrow>
              <span className="w-full">
                <SpotlightButton
                  variant={variant}
                  disabled={!enabled}
                  onClick={() => (key === 'cash' ? handleStateChange('cash') : setConfirmAction(key))}
                  className="w-full px-6 py-2.5 text-sm"
                >
                  <ActionIcon sx={{ fontSize: 16 }} /> {label}
                </SpotlightButton>
              </span>
            </Tooltip>
          );
        })}
        {isEmitido && (
          <EditButton onClick={() => navigate(`/own-check/edit/${id}`)} />
        )}
      </div>

      <AlertDialog
        open={Boolean(confirmAction)}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmLabel={confirmation?.confirmLabel}
        onConfirm={() => { const action = confirmAction; setConfirmAction(null); handleStateChange(action); }}
        onCancel={() => setConfirmAction(null)}
      />

    </div>
  );
};

export default OwnCheckDetail;
