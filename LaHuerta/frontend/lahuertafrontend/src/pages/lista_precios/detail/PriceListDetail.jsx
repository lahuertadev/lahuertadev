import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { priceListUrl, priceListProductUrl } from '../../../constants/urls';
import { formatDate } from '../../../utils/date';
import { formatCurrency } from '../../../utils/currency';
import { Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Alert, useMediaQuery } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import IconLabelButtons from '../../../components/Button';
import CustomInput from '../../../components/Input';
import { getCategoryColor } from '../../../constants/categoryColors';
import '../../../styles/print-price-list.css';
import logoLaHuerta from '../../../assets/logo-lahuerta.jpg';

const categoryBadgeStyle = (categoryName) => {
  const { bg, color } = getCategoryColor(categoryName);
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: '18px',
    backgroundColor: bg,
    color,
    whiteSpace: 'nowrap',
  };
};


const PriceListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
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

        {isMobile && (
          <Alert severity="info" className="no-print" sx={{ mb: 2 }}>
            La edición y el detalle de la lista de precios no están disponibles en dispositivos móviles en este momento. Por favor, descargue el PDF de la misma.
          </Alert>
        )}

        {/* HEADER DEL DOCUMENTO - oculto en impresión */}
        <Paper className="no-print" sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>

          {/* TÍTULO Y BOTONES */}
          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: '1px solid',borderColor: 'divider'}}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Detalle
              </Typography>
              <Typography variant="h6">
                {priceList.nombre}
              </Typography>
            </Box>

            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <IconLabelButtons
                  label="Duplicar"
                  icon={<ContentCopyIcon />}
                  onClick={handleDuplicateClick}
                />

                <IconLabelButtons
                  label="Descargar PDF"
                  icon={<DownloadOutlinedIcon />}
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
            )}
          </Box>

          <Box className="no-print" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, pt: 1 }}>
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <CustomInput
                readOnly
                multiline
                label="Descripción"
                name="descripcion"
                value={priceList.descripcion || '—'}
                onChange={() => {}}
              />
            </Box>
            <CustomInput
              readOnly
              label="Fecha de Creación"
              name="fechaCreacion"
              value={formatDate(priceList.fecha_creacion)}
              onChange={() => {}}
            />
            <CustomInput
              readOnly
              label="Última Actualización"
              name="fechaActualizacion"
              value={formatDate(priceList.fecha_actualizacion)}
              onChange={() => {}}
            />
            <CustomInput
              readOnly
              label="Cantidad de Productos"
              name="cantidadProductos"
              value={String(products.length)}
              onChange={() => {}}
            />
          </Box>

          {isMobile && (
            <Box className="no-print" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 3 }}>
              <IconLabelButtons
                label="Descargar PDF"
                icon={<DownloadOutlinedIcon />}
                onClick={handlePrint}
                sx={{ width: '100%' }}
              />

              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                color="primary"
                variant="outlined"
                fullWidth
              >
                Volver
              </Button>
            </Box>
          )}
        </Paper>

        {/* Tabla de productos - esto sí se imprime. En mobile se oculta en pantalla (ver print-price-list.css)
            pero se mantiene en el DOM para que "Imprimir / Descargar PDF" siga generando el PDF completo. */}
        <Paper className="price-list-products-section" sx={{ border: '1px solid', borderColor: 'divider', position: 'relative' }}>
          <Box className="no-print" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold">
              Productos
            </Typography>
          </Box>

          {/* Wrapper con thead/tfoot reales: la barra superior (logo + La Huerta) se repite en
              cada hoja impresa, y el tfoot reserva el espacio del footer fijo en cada hoja
              (mismo patrón que la impresión de Reportes). En pantalla es solo un contenedor
              transparente, sin apariencia de tabla. */}
          <table className="price-list-print-wrapper">
            <thead>
              <tr>
                <td>
                  <Box className="price-list-print-header-top">
                    <Box component="img" src={logoLaHuerta} alt="La Huerta" className="price-list-print-logo" />
                    <Box className="price-list-print-company">
                      <Typography component="span" className="price-list-print-company-name">La Huerta</Typography>
                      <Typography component="span" className="price-list-print-company-sub">contacto@lahuerta.com.ar</Typography>
                    </Box>
                  </Box>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {/* Título y fecha/vigencia - solo visibles al imprimir, una sola vez (no se repiten por hoja) */}
                  {(() => {
                    const printDate = new Date();
                    const validUntilDate = new Date(printDate);
                    validUntilDate.setDate(validUntilDate.getDate() + 7);
                    const fmt = (d) => d.toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                    return (
                      <>
                        <Box className="print-header">
                          <Typography className="print-title-main">
                            LA HUERTA
                          </Typography>
                          <Typography className="print-title-sub">
                            Lista de Precios
                          </Typography>
                        </Box>
                        <Box className="price-list-print-meta">
                          <Typography component="span">Fecha de impresión: {fmt(printDate)}</Typography>
                          <Typography component="span">Vigente hasta: {fmt(validUntilDate)}</Typography>
                        </Box>
                      </>
                    );
                  })()}

                  {products.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">
                        Esta lista no tiene productos asociados.
                      </Typography>
                    </Box>
                  ) : (() => {
            // Columnas dinámicas: un tipo_venta por columna
            const tvMap = {};
            products.forEach(item => {
              if (item.tipo_venta && !tvMap[item.tipo_venta.id]) {
                tvMap[item.tipo_venta.id] = item.tipo_venta;
              }
            });
            const tipoVentaColumns = Object.values(tvMap).sort((a, b) => a.id - b.id);

            // Pivot: una fila por producto
            const rowMap = {};
            products.forEach(item => {
              const prodId = item.producto.id;
              if (!rowMap[prodId]) {
                rowMap[prodId] = { producto: item.producto, precios: {} };
              }
              if (item.tipo_venta) {
                rowMap[prodId].precios[item.tipo_venta.id] = item.precio;
              }
            });
            const rows = Object.values(rowMap).sort((a, b) => {
              const catA = a.producto.categoria?.descripcion || '';
              const catB = b.producto.categoria?.descripcion || '';
              const catCmp = catA.localeCompare(catB);
              return catCmp !== 0 ? catCmp : a.producto.descripcion.localeCompare(b.producto.descripcion);
            });

            // Devuelve la abreviación de unidad según el tipo_venta
            const getAbreviacion = (producto, tipoVenta) => {
              const desc = tipoVenta?.descripcion?.toLowerCase();
              if (desc === 'unidad') return producto?.tipo_unidad?.abreviacion || '';
              if (desc === 'bulto')  return producto?.tipo_contenedor?.abreviacion || '';
              return '';
            };

            return (
              <Box className="table-wrapper">
                <Box
                  component="img"
                  src={logoLaHuerta}
                  alt="Logo La Huerta"
                  className="watermark-logo"
                />
                <TableContainer>
                  <Table aria-label="tabla de productos">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'var(--color-surface-low)' }}>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Producto</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Categoría</TableCell>
                        {tipoVentaColumns.map(tv => (
                          <TableCell key={tv.id} align="center" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                            {tv.descripcion}
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Peso Aprox.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow
                          key={row.producto.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'var(--color-surface-low)' } }}
                        >
                          <TableCell component="th" scope="row" align="center">
                            {row.producto.descripcion}
                          </TableCell>
                          <TableCell align="center">
                            {row.producto.categoria?.descripcion
                              ? <span className="price-list-category-badge" style={categoryBadgeStyle(row.producto.categoria.descripcion)}>{row.producto.categoria.descripcion}</span>
                              : '—'}
                          </TableCell>
                          {tipoVentaColumns.map(tv => (
                            <TableCell key={tv.id} align="center">
                              {row.precios[tv.id] != null
                                ? <>{formatCurrency(row.precios[tv.id])}{' '}<span className="price-list-muted-text" style={{ color: 'var(--color-on-surface-muted)', fontSize: '0.9em' }}>{getAbreviacion(row.producto, tv)}</span></>
                                : '—'
                              }
                            </TableCell>
                          ))}
                          <TableCell align="center">
                            <span className="price-list-muted-text" style={{ color: 'var(--color-on-surface-muted)' }}>
                              {row.producto.cantidad_por_bulto || '—'} {row.producto.tipo_unidad?.abreviacion || ''}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
                    );
                  })()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  {/* Reserva el espacio del footer fijo en cada hoja para que el contenido no lo pise */}
                  <div className="price-list-print-footer-placeholder" />
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer visual, fijo al pie de cada hoja impresa */}
          <Box className="price-list-print-footer">
            <Typography variant="caption">
              © {new Date().getFullYear()} La Huerta Agro Management · Documento de uso interno ·{' '}
              {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
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
