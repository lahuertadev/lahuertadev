import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { priceListUrl, priceListProductUrl, saleTypeUrl } from '../../../constants/urls';
import { formatDate } from '../../../utils/date';
import { formatCurrency } from '../../../utils/currency';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, Alert, useMediaQuery } from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import BackButton from '../../../components/BackButton';
import SpotlightButton from '../../../components/SpotlightButton';
import { useToast } from '../../../context/ToastContext';
import AssignClientsDialog from '../shared/AssignClientsDialog';
import dialogPaperSx from '../shared/dialogPaperSx';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
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
  const { showToast } = useToast();
  const [priceList, setPriceList] = useState(null);
  const [products, setProducts] = useState([]);
  const [saleTypes, setSaleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
  const [openDuplicateDialog, setOpenDuplicateDialog] = useState(false);
  const [duplicateError, setDuplicateError] = useState(null);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener la lista de precios
        const listResponse = await axios.get(`${priceListUrl}${id}/`);
        setPriceList(listResponse.data);

        // Obtener los productos de la lista
        const productsResponse = await axios.get(`${priceListProductUrl}?lista_precios=${id}`);
        setProducts(productsResponse.data || []);

        // Catálogo completo de tipos de venta, para mostrar siempre todas las columnas de precio
        // (no solo los tipos de venta que ya tienen algún precio cargado en esta lista puntual)
        const saleTypesResponse = await axios.get(saleTypeUrl);
        setSaleTypes(saleTypesResponse.data || []);
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
  };

  const handleDuplicateConfirm = async () => {
    setDuplicating(true);
    setDuplicateError(null);

    try {
      const response = await axios.post(`${priceListUrl}${id}/duplicate/`);
      // Mismo patrón que crear/editar/eliminar: toast global y directo a la edición de la copia.
      setOpenDuplicateDialog(false);
      showToast(`La lista se duplicó correctamente como "${response.data.nombre}".`);
      navigate(`/price-list/edit/${response.data.id}`);
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
    if (!duplicating) {
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
        <div className="mt-2">
          <BackButton onClick={handleBack} label="Volver al listado" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto h-full flex flex-col rounded p-4 price-list-detail-page">
      <Box className="price-list-print-content" sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>

        {isMobile && (
          <Alert severity="info" className="no-print" sx={{ mb: 2 }}>
            La edición y el detalle de la lista de precios no están disponibles en dispositivos móviles en este momento. Por favor, descargue el PDF de la misma.
          </Alert>
        )}

        <AssignClientsDialog
          open={openAssignDialog}
          priceList={priceList}
          onClose={() => setOpenAssignDialog(false)}
          onAssigned={(assigned) =>
            showToast(`La lista se asignó a ${assigned} cliente${assigned === 1 ? '' : 's'} correctamente.`)
          }
        />

        {/* HEADER DEL DOCUMENTO - oculto en impresión. Mismo patrón que "Editar lista". */}
        <div className="no-print bg-surface-card rounded-xl shadow-sm border border-border-subtle mb-6">
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border-subtle">
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent">Lista de precios</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface break-words">{priceList.nombre}</h1>
              <p className="mt-1 text-sm text-on-surface-muted break-words">{priceList.descripcion || 'Sin descripción'}</p>
            </div>
            {/* Mismo tamaño que Duplicar / Descargar PDF */}
            <BackButton onClick={handleBack} className="shrink-0 px-5 py-2.5 text-sm" />
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-5">
            {[
              { label: 'Fecha de creación', value: formatDate(priceList.fecha_creacion) },
              { label: 'Última actualización', value: formatDate(priceList.fecha_actualizacion) },
              { label: 'Productos', value: new Set(products.map((p) => p.producto.id)).size },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border-subtle bg-surface-low px-4 py-3">
                <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-muted">{label}</dt>
                <dd className="mt-1 text-base font-semibold text-on-surface">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-6 py-4 border-t border-border-subtle">
            {!isMobile && (
              <SpotlightButton variant="outline" onClick={() => setOpenAssignDialog(true)} className="w-full sm:w-auto px-5 py-2.5 text-sm">
                <GroupAddOutlinedIcon sx={{ fontSize: 18 }} />
                Asignar a clientes
              </SpotlightButton>
            )}
            {!isMobile && (
              <SpotlightButton variant="outline" onClick={handleDuplicateClick} className="w-full sm:w-auto px-5 py-2.5 text-sm">
                <ContentCopyIcon sx={{ fontSize: 18 }} />
                Duplicar
              </SpotlightButton>
            )}
            <SpotlightButton variant="primary" onClick={handlePrint} className="w-full sm:w-auto px-5 py-2.5 text-sm">
              <DownloadOutlinedIcon sx={{ fontSize: 18 }} />
              Descargar PDF
            </SpotlightButton>
          </div>
        </div>

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
                          <Typography component="span"><strong>Fecha de impresión:</strong> {fmt(printDate)}</Typography>
                          <Typography component="span"><strong>Vigente hasta:</strong> {fmt(validUntilDate)}</Typography>
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
            // Columnas de precio: una por cada tipo_venta del catálogo (Unidad, Bulto, etc.),
            // no solo los que ya tienen algún precio cargado en esta lista puntual.
            const tipoVentaColumns = [...saleTypes].sort((a, b) => a.id - b.id);

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
                    <colgroup>
                      <col /> {/* Producto */}
                      <col /> {/* Categoría */}
                      {tipoVentaColumns.map(tv => <col key={tv.id} />) /* una por cada tipo de venta */}
                      <col /> {/* Peso Aprox. / Cantidad */}
                    </colgroup>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'var(--color-surface-low)' }}>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Producto</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Categoría</TableCell>
                        {tipoVentaColumns.map(tv => (
                          <TableCell key={tv.id} align="center" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                            {tv.descripcion}
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Peso Aprox. / Cantidad</TableCell>
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
                              {row.producto.peso_aproximado ?? row.producto.cantidad_por_bulto ?? '—'} {row.producto.tipo_unidad?.abreviacion || ''}
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
            <Typography variant="caption" component="span">Ciudadela, 3 de Febrero, Bs. As.</Typography>
            <Typography variant="caption" component="span">
              Fecha de impresión: {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
        PaperProps={{ sx: dialogPaperSx }}
      >
        <div className="p-5 sm:p-6">
          {/* Encabezado con ícono, mismo patrón que el diálogo de confirmación del sitio */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-lahuerta/10 text-accent">
              <ContentCopyIcon sx={{ fontSize: 20 }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-on-surface">Duplicar Lista de Precios</h2>
              <p className="mt-1 text-sm text-on-surface-muted">
                Se crea una copia con todos los productos y precios. Después podés cambiarle el nombre y los precios en la edición.
              </p>
            </div>
          </div>

          {/* Resumen de la copia */}
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-low px-4 py-3">
              <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-muted">Nueva lista</dt>
              <dd className="mt-1 text-sm font-semibold text-on-surface break-words">Copia De {priceList?.nombre}</dd>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-low px-4 py-3">
              <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-muted">Productos</dt>
              <dd className="mt-1 text-sm font-semibold text-on-surface">{new Set(products.map((p) => p.producto.id)).size}</dd>
            </div>
          </dl>

          {duplicateError && <p className="mt-4 text-xs font-medium text-red-500">{duplicateError}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
            <SpotlightButton variant="cancel" onClick={handleDuplicateClose} disabled={duplicating} className="w-full sm:w-auto px-5 py-2.5 text-sm">
              Cancelar
            </SpotlightButton>
            <SpotlightButton variant="primary" onClick={handleDuplicateConfirm} disabled={duplicating} className="w-full sm:w-auto px-5 py-2.5 text-sm">
              <ContentCopyIcon sx={{ fontSize: 18 }} />
              {duplicating ? 'Duplicando…' : 'Duplicar'}
            </SpotlightButton>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default PriceListDetail;
