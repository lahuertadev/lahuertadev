import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { expenseUrl } from '../../../constants/urls';
import { HOME, FINANZAS } from '../../../constants/breadcrumbs';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import AlertDialog from '../../../components/DialogAlert';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
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

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`${expenseUrl}${id}/`);
    navigate('/expense');
  };

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const response = await axios.get(`${expenseUrl}${id}/`);
        setExpense(response.data);
      } catch (err) {
        console.error('Error cargando gasto:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchExpense();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el gasto.</p>
        <button
          onClick={() => navigate('/expense')}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-accent transition-colors"
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
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate(HOME.path)}>{HOME.label}</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap text-on-surface-muted">{FINANZAS.label}</span>
        <span className="text-xs">›</span>
        <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/expense')}>Gastos</span>
        <span className="text-xs">›</span>
        <span className="text-on-surface font-semibold">{formatDate(expense.fecha)}</span>
      </nav>

      {/* Datos del Gasto */}
      <SectionCard icon={<PaidOutlinedIcon sx={{ fontSize: 20 }} />} title="Datos del Gasto">
        <Field label="Fecha" value={formatDate(expense.fecha)} />
        <Field label="Importe" value={formatCurrency(expense.importe)} />
        <Field label="Tipo de Gasto" value={expense.tipo_gasto?.descripcion} />
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
                onClick={() => navigate(`/expense/edit/${id}`)}
                className="flex-1 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center justify-center gap-2"
              >
                <EditIcon sx={{ fontSize: 16 }} /> Editar
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/expense')}
              className="w-full py-2.5 rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/expense')}
              className="px-5 py-2.5 rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center gap-2"
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Volver
            </button>
            <button
              type="button"
              onClick={() => navigate(`/expense/edit/${id}`)}
              className="px-5 py-2.5 rounded-lg bg-blue-lahuerta text-white text-sm font-semibold hover:bg-blue-lahuerta/90 transition-colors flex items-center gap-2"
            >
              <EditIcon sx={{ fontSize: 16 }} /> Editar gasto
            </button>
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar gasto"
        message="¿Estás seguro que querés eliminar este gasto? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default ExpenseDetail;
