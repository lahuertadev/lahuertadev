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
import BackButton from '../../../components/BackButton';
import PageHeader from '../../../components/PageHeader';
import DeleteButton from '../../../components/DeleteButton';
import EditButton from '../../../components/EditButton';

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
        <BackButton onClick={() => navigate('/expense')} label="Volver al listado" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      <PageHeader
        breadcrumbs={[
          HOME,
          FINANZAS,
          { label: 'Gastos', path: '/expense' },
          { label: formatDate(expense.fecha) },
        ]}
        onBack={() => navigate('/expense')}
      />

      {/* Datos del Gasto */}
      <SectionCard icon={<PaidOutlinedIcon sx={{ fontSize: 20 }} />} title="Datos del Gasto">
        <Field label="Fecha" value={formatDate(expense.fecha)} />
        <Field label="Importe" value={formatCurrency(expense.importe)} />
        <Field label="Tipo de Gasto" value={expense.tipo_gasto?.descripcion} />
      </SectionCard>

      {/* Acciones. En desktop: solo Editar (Volver va arriba; Eliminar está en la columna Acción del
          listado). En mobile el listado no tiene esa columna, así que acá van Eliminar, Editar y Volver. */}
      <div className="flex flex-col-reverse gap-3 pt-6 border-t border-border-subtle sm:flex-row sm:justify-end sm:gap-4">
        <div className="sm:hidden">
          <BackButton onClick={() => navigate('/expense')} className="w-full px-6 py-2.5 text-sm" />
        </div>
        {isMobile && (
          <DeleteButton onClick={() => setConfirmOpen(true)} />
        )}
        <EditButton onClick={() => navigate(`/expense/edit/${id}`)} label="Editar gasto" />
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
