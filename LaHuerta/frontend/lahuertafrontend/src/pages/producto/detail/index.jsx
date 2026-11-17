import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { productUrl } from '../../../constants/urls';
import AlertDialog from '../../../components/DialogAlert';
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined';
import StraightenIcon from '@mui/icons-material/StraightenOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import BackButton from '../../../components/BackButton';
import PageHeader from '../../../components/PageHeader';
import EditButton from '../../../components/EditButton';
import SpotlightButton from '../../../components/SpotlightButton';

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

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`${productUrl}${id}/`);
    navigate('/product');
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${productUrl}${id}/`);
        setProduct(response.data);
      } catch (err) {
        console.error('Error cargando producto:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
        <p className="text-sm text-red-500">Error al cargar el producto.</p>
        <BackButton onClick={() => navigate('/product')} label="Volver al listado" />
      </div>
    );
  }

  const measurementType = product.tipo_unidad?.tipo_medicion;

  const commercialField =
    measurementType === 'PESO'
      ? { label: 'Peso Aproximado', value: product.peso_aproximado != null ? `${product.peso_aproximado} kg` : null }
      : measurementType === 'CANTIDAD'
        ? { label: 'Cantidad por Bulto', value: product.cantidad_por_bulto }
        : null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">

      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', path: '/' },
          { label: 'Productos', path: '/product' },
          { label: product.descripcion },
        ]}
        onBack={() => navigate('/product')}
      />

      {/* 1. Información General */}
      <SectionCard icon={<Inventory2Icon sx={{ fontSize: 20 }} />} title="Información General">
        <Field label="Producto" value={product.descripcion} />
        <Field label="Categoría" value={product.categoria?.descripcion} />
      </SectionCard>

      {/* 2. Presentación y Medidas */}
      <SectionCard icon={<StraightenIcon sx={{ fontSize: 20 }} />} title="Presentación y Medidas">
        <Field label="Tipo de Contenedor" value={product.tipo_contenedor?.descripcion} />
        <Field label="Tipo de Unidad" value={product.tipo_unidad?.descripcion} />
        {commercialField && <Field label={commercialField.label} value={commercialField.value} />}
      </SectionCard>

      {/* Acciones. En desktop: solo Editar (Volver va arriba; Eliminar está en la columna Acción del
          listado). En mobile el listado no tiene esa columna, así que acá van Eliminar, Editar y Volver. */}
      <div className="flex flex-col-reverse gap-3 pt-6 border-t border-border-subtle sm:flex-row sm:justify-end sm:gap-4">
        <div className="sm:hidden">
          <BackButton onClick={() => navigate('/product')} className="w-full px-6 py-2.5 text-sm" />
        </div>
        {isMobile && (
          <SpotlightButton variant="danger" onClick={() => setConfirmOpen(true)} className="w-full px-6 py-2.5 text-sm">
            <DeleteIcon sx={{ fontSize: 16 }} /> Eliminar
          </SpotlightButton>
        )}
        <EditButton onClick={() => navigate(`/product/edit/${id}`)} label="Editar producto" />
      </div>

      <AlertDialog
        open={confirmOpen}
        title="Eliminar producto"
        message={`¿Estás seguro que querés eliminar "${product?.descripcion}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

    </div>
  );
};

export default ProductDetail;
