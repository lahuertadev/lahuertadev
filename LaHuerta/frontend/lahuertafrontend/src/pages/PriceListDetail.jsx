import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { priceListUrl, priceListProductUrl } from '../constants/urls';
import { formatDate } from '../utils/date';
import { formatCurrency } from '../utils/currency';
import { Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconLabelButtons from '../components/Button';
import '../styles/print-price-list.css';
import logoLaHuerta from '../assets/logo-lahuerta.jpg';


const PriceListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [priceList, setPriceList] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
  const [openDuplicateDialog, setOpenDuplicateDialog] = useState(false);
  const [duplicateError, setDuplicateError] = useState(null);
  const [duplicateSuccess, setDuplicateSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener la lista de precios
        const listResponse = await axios.get(`${priceListUrl}${id}/`);
        setPriceList(listResponse.data);

        // Obtener los productos de la lista
        const productsResponse = await axios.get(`${priceListProductUrl}?lista_precios=${id}`);
        setProducts(productsResponse.data || []);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleBack = () => {
    navigate('/price-list');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDuplicateClick = () => {
    setOpenDuplicateDialog(true);
    setDuplicateError(null);
    setDuplicateSuccess(false);
  };

  const handleDuplicateConfirm = async () => {
    setDuplicating(true);
    setDuplicateError(null);
    
    try {
      const response = await axios.post(`${priceListUrl}${id}/duplicate/`);
      setDuplicateSuccess(true);
      
      // Redirigir a la página de edición de la nueva lista después de 2 segundos
      setTimeout(() => {
        navigate(`/price-list/edit/${response.data.id}`);
      }, 2000);
    } catch (err) {
      console.error('Error duplicando lista:', err);
      setDuplicateError(
        err.response?.data?.error || 
        'Error al duplicar la lista de precios. Intente nuevamente.'
      );
    } finally {
      setDuplicating(false);
    }
  };

  const handleDuplicateClose = () => {
    if (!duplicating && !duplicateSuccess) {
      setOpenDuplicateDialog(false);
      setDuplicateError(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !priceList) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-red-600">Error al cargar la lista de precios. {error}</p>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} color="primary" variant="outlined" sx={{ mt: 2 }}>
          Volver al listado
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto h-full flex flex-col rounded p-4">
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>

        {/* HEADER DEL DOCUMENTO - oculto en impresión */}
        <Paper className="no-print" sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>

          {/* TÍTULO Y BOTONES */}
          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: '1px solid',borderColor: 'divider'}}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                La Huerta
              </Typography>
              <Typography variant="h6">
                {priceList.nombre}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <IconLabelButtons
                label="Duplicar"
                icon={<ContentCopyIcon />}
                onClick={handleDuplicateClick}
              />

              <IconLabelButtons
                label="Imprimir / Descargar PDF"
                icon={<PrintIcon />}
                onClick={handlePrint}
              />

              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                color="primary"
                variant="outlined"
              >
                Volver
              </Button>
            </Box>
          </Box>

          <Box className="no-print" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                Descripción
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {priceList.descripcion || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                Fecha de Creación
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {formatDate(priceList.fecha_creacion)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                Última Actualización
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {formatDate(priceList.fecha_actualizacion)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                Cantidad de Productos
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {products.length}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Tabla de productos - esto sí se imprime */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', position: 'relative' }}>
          {/* Encabezado para impresión */}
          <Box className="print-header">
            <Typography className="print-title-main">
              LA HUERTA
            </Typography>
            <Typography className="print-title-sub">
              Lista de Precios
            </Typography>
          </Box>

          {/* Fecha de impresión - solo visible al imprimir */}
          <Typography 
            className="print-date" 
            sx={{ display: 'none' }}
          >
            Fecha de impresión: {new Date().toLocaleDateString('es-AR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}
          </Typography>

          <Box className="no-print" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold">
              Productos
            </Typography>
          </Box>

          {products.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Esta lista no tiene productos asociados.
              </Typography>
            </Box>
          ) : (
            <Box className="table-wrapper">
              {/* Marca de agua con logo */}
              <Box
                component="img"
                src={logoLaHuerta}
                alt="Logo La Huerta"
                className="watermark-logo"
              />
              <TableContainer>
                <Table aria-label="tabla de productos">
                <colgroup>
                  <col style={{ width: '45%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '17.5%' }} />
                  <col style={{ width: '17.5%' }} />
                </colgroup>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Producto</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Categoría</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Precio Unitario</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Precio Bulto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((item) => (
                    <TableRow
                      key={item.id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'grey.50' } }}
                    >
                      <TableCell component="th" scope="row">
                        {item.producto?.descripcion || '—'}
                      </TableCell>
                      <TableCell>{item.producto?.categoria?.descripcion || '—'}</TableCell>
                      <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.precio_bulto)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Diálogo de confirmación para duplicar */}
      <Dialog
        open={openDuplicateDialog}
        onClose={handleDuplicateClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Duplicar Lista de Precios
        </DialogTitle>
        <DialogContent>
          {duplicateSuccess ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Lista duplicada exitosamente. Redirigiendo a la edición...
            </Alert>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                ¿Estás seguro que querés duplicar la lista de precios <strong>"{priceList?.nombre}"</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Se creará una nueva lista con el nombre "Copia de {priceList?.nombre}" 
                con todos los productos y precios de esta lista. Podrás editar el nombre 
                y los precios en la página de edición.
              </Typography>
              {duplicateError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {duplicateError}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!duplicateSuccess && (
            <>
              <Button 
                onClick={handleDuplicateClose} 
                disabled={duplicating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDuplicateConfirm}
                color="primary"
                variant="contained"
                disabled={duplicating}
              >
                {duplicating ? 'Duplicando...' : 'Duplicar'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PriceListDetail;
