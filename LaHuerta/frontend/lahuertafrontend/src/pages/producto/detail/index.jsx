import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { productUrl } from '../../../constants/urls';
import { formatCuit } from '../../../utils/cuit';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { Box, Paper, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClient = async () => {
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

    if (id) fetchClient();
  }, [id]);

  const handleBack = () => {
    navigate('/product');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-red-600">Error al cargar el producto. {error}</p>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} color="primary" variant="outlined" sx={{ mt: 2 }}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const fields = [
    { label: 'Producto', value: product.descripcion },
    { label: 'Categoría', value: product.categoria?.descripcion || '—' },
    { label: 'Tipo de Contenedor', value: product.tipo_contenedor?.descripcion || '—' },
    { label: 'Tipo de Unidad', value: product.tipo_unidad?.descripcion || '-' },
    { label: 'Cantidad por Bulto', value: product.cantidad_por_bulto || '-' },
    { label: 'Peso Aproximado', value: product.cantidad_por_bulto || '—' },
  ];

  return (
    <div className="container mx-auto h-full flex flex-col rounded">
      <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', p: 2 }}>
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h5" component="h1" fontWeight="bold" color="text.primary">
              Detalle del producto
            </Typography>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              color="primary"
              variant="outlined"
              size="medium"
              sx={{
                fontWeight: 600,
                px: 2.5,
                py: 1.25,
                minWidth: 180,
              }}
            >
              Volver al listado
            </Button>
          </Box>
          <Box sx={{ pt: 1 }}>
            {fields.map(({ label, value }) => (
              <Box key={label} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  {label}
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </div>
  );
};

export default ProductDetail;
