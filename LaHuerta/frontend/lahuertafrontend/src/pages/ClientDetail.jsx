import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { clientUrl } from '../constants/urls';
import { formatCuit } from '../utils/cuit';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { Box, Paper, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await axios.get(`${clientUrl}${id}/`);
        setClient(response.data);
      } catch (err) {
        console.error('Error cargando cliente:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchClient();
  }, [id]);

  const handleBack = () => {
    navigate('/client');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-red-600">Error al cargar el cliente. {error}</p>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} color="primary" variant="outlined" sx={{ mt: 2 }}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const address = client.localidad
    ? `${client.domicilio || ''}, ${client.localidad.nombre || ''}, ${client.localidad.municipio?.nombre || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
    : client.domicilio || '—';

  const fields = [
    { label: 'CUIT', value: formatCuit(client.cuit) },
    { label: 'Razón social', value: client.razon_social || '—' },
    { label: 'Nombre fantasía', value: client.nombre_fantasia || '—' },
    { label: 'Cuenta corriente', value: formatCurrency(client.cuenta_corriente) },
    { label: 'Domicilio', value: address },
    { label: 'Teléfono', value: client.telefono || '—' },
    { label: 'Tipo de facturación', value: client.tipo_facturacion?.descripcion || '—' },
    { label: 'Condición IVA', value: client.condicion_IVA?.descripcion || '—' },
    { label: 'Fecha inicio de ventas', value: formatDate(client.fecha_inicio_ventas) || '—' },
    { label: 'Estado', value: client.estado ? 'Activo' : 'Inactivo' },
  ];

  return (
    <div className="container mx-auto h-full flex flex-col rounded">
      <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', p: 2 }}>
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h5" component="h1" fontWeight="bold" color="text.primary">
              Detalle del cliente
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

export default ClientDetail;
