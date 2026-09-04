import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Avatar from '@mui/material/Avatar';
import { authUsersUrl } from '../../../constants/urls';
import { ROLE_CONFIG } from '../../../constants/roles';
import { formatDate } from '../../../utils/date';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const SectionCard = ({ icon, title, children, cols = 2 }) => (
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

const RoleBadge = ({ role }) => {
  const config = ROLE_CONFIG[role] || {};
  return (
    <div className="flex flex-col gap-1">
      <span className={labelCls}>Rol</span>
      <div>
        <span
          className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: config.bg || '#f0f4f7', color: config.color || '#596064' }}
        >
          {config.label || role}
        </span>
      </div>
    </div>
  );
};

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${authUsersUrl}${id}/`);
        setUser(response.data);
      } catch (err) {
        console.error('Error cargando usuario:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el usuario.</p>
        <button
          onClick={() => navigate('/user')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver al listado
        </button>
      </div>
    );
  }

  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/user')}>Usuarios</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">{displayName}</span>
      </nav>

      {/* 1. Datos de la cuenta */}
      <SectionCard icon={<BadgeIcon sx={{ fontSize: 20 }} />} title="Datos de la Cuenta">
        <Field label="Email" value={user.email} />
        <Field label="Nombre de usuario" value={user.username} />
        <RoleBadge role={user.role} />
        <Field label="Miembro desde" value={user.date_joined ? formatDate(user.date_joined) : ''} />
      </SectionCard>

      {/* 2. Datos personales */}
      <SectionCard icon={<PersonIcon sx={{ fontSize: 20 }} />} title="Datos Personales">
        <div className="flex items-center gap-6 md:col-span-2">
          <Avatar src={user.avatar || undefined} sx={{ width: 96, height: 96, fontSize: '2rem', bgcolor: '#4a7bc4' }}>
            {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
          </Avatar>
        </div>
        <Field label="Nombre" value={user.first_name} />
        <Field label="Apellido" value={user.last_name} />
        <Field label="Fecha de nacimiento" value={user.birth_date ? formatDate(user.birth_date) : ''} />
        <Field label="Teléfono" value={user.phone} />
        <div className="md:col-span-2">
          <Field label="Domicilio" value={user.address} />
        </div>
      </SectionCard>

      {/* Action Bar */}
      <div className="pt-6 border-t border-border-subtle flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate('/user')}
          className="px-5 py-2.5 rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center gap-2"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
        </button>
      </div>

    </div>
  );
};

export default UserDetail;
