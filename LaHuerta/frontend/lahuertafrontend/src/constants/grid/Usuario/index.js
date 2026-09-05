import React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ROLE_CONFIG } from '../../roles';

const ROLE_MENU_OPTIONS = [
  { value: 'administrator', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
];

// "Pendiente" no es una opción elegible: es solo el rótulo de display para un
// usuario que todavía no fue revisado (approved_at=None). El select real solo
// ofrece los dos estados a los que un superusuario puede decidir moverlo.
const STATUS_MENU_OPTIONS = [
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
];

const STATUS_CONFIG = {
  active: { label: 'Activo', bg: '#e6f4ea', color: '#15803d' },
  inactive: { label: 'Inactivo', bg: '#fdeaea', color: '#dc2626' },
  pending: { label: 'Pendiente', bg: '#fff1e0', color: '#c2650a' },
};

const pillStyle = (bg, color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: '16px',
  backgroundColor: bg,
  color,
  whiteSpace: 'nowrap',
});

// El <select> real queda invisible, encima del badge de color — así conserva
// el popup nativo del navegador (igual que "Cliente" en FacturaForm.js) pero
// se ve como un badge con flecha en vez de una caja de select.
const RoleCell = ({ params, onChangeRole, busyId }) => {
  const cfg = ROLE_CONFIG[params.value] || { label: params.value, bg: '#f0f4f7', color: '#596064' };
  const isBusy = busyId === params.row.id;

  if (params.value === 'superuser') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        <span style={pillStyle(cfg.bg, cfg.color)}>{cfg.label}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
      <div style={{ position: 'relative', display: 'inline-flex', opacity: isBusy ? 0.6 : 1 }}>
        <span style={{ ...pillStyle(cfg.bg, cfg.color), pointerEvents: 'none' }}>
          {cfg.label}
          <ExpandMoreIcon sx={{ fontSize: 14 }} />
        </span>
        <select
          value={params.value}
          disabled={isBusy}
          onChange={(e) => onChangeRole(params.row.id, e.target.value)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            border: 'none',
            cursor: isBusy ? 'default' : 'pointer',
          }}
        >
          {ROLE_MENU_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

// Mismo patrón que RoleCell (select real invisible encima del badge). Antes
// era un switch on/off, pero eso solo alcanza para 2 estados: con "Pendiente"
// de por medio hay 3 lecturas posibles (Pendiente / Activo / Inactivo), así
// que necesita un select igual que Rol. "Pendiente" es solo el rótulo inicial
// de un usuario nunca revisado (approved_at=None) — no es una opción elegible,
// el select solo deja moverlo a Activo o Inactivo, cualquiera de las dos lo
// saca de "pendiente" para siempre (ver UserRepository.set_active_status).
const StatusCell = ({ params, onChangeStatus, currentUserId, busyId }) => {
  const isSelf = params.row.id === currentUserId;
  const isSuperuser = params.row.role === 'superuser';
  const isBusy = busyId === params.row.id;
  const isActive = Boolean(params.value);
  const isPending = params.row.pendingApproval;

  const cfg = STATUS_CONFIG[isActive ? 'active' : isPending ? 'pending' : 'inactive'];

  if (isSelf || isSuperuser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        <span style={pillStyle(cfg.bg, cfg.color)}>{cfg.label}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
      <div style={{ position: 'relative', display: 'inline-flex', opacity: isBusy ? 0.6 : 1 }}>
        <span style={{ ...pillStyle(cfg.bg, cfg.color), pointerEvents: 'none' }}>
          {cfg.label}
          <ExpandMoreIcon sx={{ fontSize: 14 }} />
        </span>
        <select
          value={String(isActive)}
          disabled={isBusy}
          onChange={(e) => onChangeStatus(params.row.id, e.target.value === 'true')}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            border: 'none',
            cursor: isBusy ? 'default' : 'pointer',
          }}
        >
          {STATUS_MENU_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

/**
 * Columnas de la grilla de Usuarios.
 * Requiere handlers para las acciones por fila (togglear estado, cambiar rol),
 * porque a diferencia del resto de las grillas del proyecto estas columnas
 * disparan un PATCH en vez de navegar a otra pantalla.
 *
 * @param {(id: number, isActive: boolean) => void} onChangeStatus
 * @param {(id: number, role: string) => void} onChangeRole
 * @param {number} currentUserId — id del usuario logueado, para ocultar su propia acción de estado
 * @param {number|null} busyId — id de la fila con una acción en curso (deshabilita botones)
 */
export const getColumns = ({ onChangeStatus, onChangeRole, currentUserId, busyId }) => [
  { field: 'name', headerName: 'Nombre', align: 'center', headerAlign: 'center', flex: 1 },
  { field: 'email', headerName: 'Email', align: 'center', headerAlign: 'center', flex: 1, hiddenOnMobile: true },
  {
    field: 'role',
    headerName: 'Rol',
    minWidth: 170,
    align: 'center',
    headerAlign: 'center',
    hiddenOnMobile: true,
    renderCell: (params) => <RoleCell params={params} onChangeRole={onChangeRole} busyId={busyId} />,
  },
  {
    field: 'active',
    headerName: 'Estado',
    minWidth: 150,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <StatusCell params={params} onChangeStatus={onChangeStatus} currentUserId={currentUserId} busyId={busyId} />
    ),
  },
  { field: 'createdAt', headerName: 'Fecha de alta', align: 'center', headerAlign: 'center', hiddenOnMobile: true },
];
