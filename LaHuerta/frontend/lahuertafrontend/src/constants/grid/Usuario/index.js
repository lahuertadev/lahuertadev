import React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ROLE_CONFIG } from '../../roles';

const ROLE_MENU_OPTIONS = [
  { value: 'administrator', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
];

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

// Mismo switch (checkbox + estilos) que "Cliente activo" en ClientForm.js.
const StatusCell = ({ params, onToggleActive, currentUserId, busyId }) => {
  const isSelf = params.row.id === currentUserId;
  const isSuperuser = params.row.role === 'superuser';
  const isBusy = busyId === params.row.id;
  const isActive = Boolean(params.value);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: '100%' }}>
      {isSelf || isSuperuser ? (
        <span className={`text-xs font-semibold ${isActive ? 'text-green-700' : 'text-red-600'}`}>
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      ) : (
        <>
          <span className={`text-xs font-semibold ${isActive ? 'text-green-700' : 'text-red-600'}`}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
          <label className={`relative inline-flex items-center ${isBusy ? 'cursor-default opacity-60' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={isActive}
              disabled={isBusy}
              onChange={() => onToggleActive(params.row.id)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-lahuerta after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </>
      )}
    </div>
  );
};

/**
 * Columnas de la grilla de Usuarios.
 * Requiere handlers para las acciones por fila (togglear estado, cambiar rol),
 * porque a diferencia del resto de las grillas del proyecto estas columnas
 * disparan un PATCH en vez de navegar a otra pantalla.
 *
 * @param {(id: number) => void} onToggleActive
 * @param {(id: number, role: string) => void} onChangeRole
 * @param {number} currentUserId — id del usuario logueado, para ocultar su propia acción de estado
 * @param {number|null} busyId — id de la fila con una acción en curso (deshabilita botones)
 */
export const getColumns = ({ onToggleActive, onChangeRole, currentUserId, busyId }) => [
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
      <StatusCell params={params} onToggleActive={onToggleActive} currentUserId={currentUserId} busyId={busyId} />
    ),
  },
  { field: 'createdAt', headerName: 'Fecha de alta', align: 'center', headerAlign: 'center', hiddenOnMobile: true },
];
