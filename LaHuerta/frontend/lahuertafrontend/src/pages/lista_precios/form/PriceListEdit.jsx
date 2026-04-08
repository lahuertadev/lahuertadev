import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { priceListUrl, priceListProductUrl, productUrl, saleTypeUrl } from '../../../constants/urls';

import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Alert,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';

const PriceListEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [priceList, setPriceList] = useState(null);
  const [products, setProducts] = useState([]);
  const [originalProducts, setOriginalProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [saleTypes, setSaleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newPrices, setNewPrices] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [originalListName, setOriginalListName] = useState('');
  const [originalListDescription, setOriginalListDescription] = useState('');
  const [listMetadataChanged, setListMetadataChanged] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listRes, productsRes, allProductsRes, saleTypesRes] = await Promise.all([
          axios.get(`${priceListUrl}${id}/`),
          axios.get(`${priceListProductUrl}?price_list=${id}`),
          axios.get(productUrl),
          axios.get(saleTypeUrl),
        ]);

        setPriceList(listRes.data);
        setListName(listRes.data.nombre);
        setListDescription(listRes.data.descripcion);
        setOriginalListName(listRes.data.nombre);
        setOriginalListDescription(listRes.data.descripcion);

        setProducts(productsRes.data);
        setOriginalProducts(JSON.parse(JSON.stringify(productsRes.data)));

        setAllProducts(allProductsRes.data);
        setSaleTypes(saleTypesRes.data);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar los datos');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Detectar cambios en metadatos de la lista
  useEffect(() => {
    const metadataChanged =
      listName !== originalListName ||
      listDescription !== originalListDescription;
    setListMetadataChanged(metadataChanged);
  }, [listName, listDescription, originalListName, originalListDescription]);

  // Detectar cambios en productos
  useEffect(() => {
    const changes = products.some((product) => {
      const original = originalProducts.find(p => p.id === product.id);
      if (!original) return false;
      return String(product.precio) !== String(original.precio);
    });
    setHasChanges(changes || listMetadataChanged);
  }, [products, originalProducts, listMetadataChanged]);

  // Advertencia antes de salir con cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handlePriceChange = (productId, tipoVentaId, value) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    setProducts(prev =>
      prev.map(item =>
        item.producto?.id === productId && item.tipo_venta?.id === tipoVentaId
          ? { ...item, precio: value }
          : item
      )
    );
  };

  const handleDeleteProduct = (productId) => {
    setProductToDelete({ productId });
    setOpenDeleteDialog(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const { productId } = productToDelete;
    // Eliminar todos los registros (uno por tipo_venta) del producto en esta lista
    const itemsToDelete = products.filter(p => p.producto?.id === productId);
    try {
      await Promise.all(itemsToDelete.map(item => axios.delete(`${priceListProductUrl}${item.id}/`)));
      setProducts(prev => prev.filter(p => p.producto?.id !== productId));
      setOriginalProducts(prev => prev.filter(p => p.producto?.id !== productId));
      setSnackbar({ open: true, message: 'Producto eliminado correctamente', severity: 'success' });
    } catch (err) {
      console.error('Error deleting product:', err);
      setSnackbar({ open: true, message: 'Error al eliminar el producto', severity: 'error' });
    } finally {
      setOpenDeleteDialog(false);
      setProductToDelete(null);
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      if (listMetadataChanged) {
        try {
          await axios.patch(`${priceListUrl}${id}/`, {
            nombre: listName,
            descripcion: listDescription,
          });
          setOriginalListName(listName);
          setOriginalListDescription(listDescription);
          setPriceList(prev => ({ ...prev, nombre: listName, descripcion: listDescription }));
          successCount++;
        } catch (err) {
          const msg = err.response?.data?.error || 'Error al actualizar el nombre/descripción';
          setSnackbar({ open: true, message: msg, severity: 'error' });
          setSaving(false);
          return;
        }
      }

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (!product.precio || parseFloat(product.precio) <= 0) {
          setSnackbar({ open: true, message: `El precio debe ser mayor a 0 (fila ${i + 1})`, severity: 'error' });
          setSaving(false);
          return;
        }
      }

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const original = originalProducts.find(p => p.id === product.id);
        if (original && String(product.precio) !== String(original.precio)) {
          try {
            await axios.patch(`${priceListProductUrl}${product.id}/`, {
              precio: parseFloat(product.precio),
            });
            successCount++;
          } catch (err) {
            console.error(`Error updating product ${product.id}:`, err);
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        setSnackbar({ open: true, message: `${successCount} cambios guardados correctamente`, severity: 'success' });
        setOriginalProducts(JSON.parse(JSON.stringify(products)));
        setHasChanges(false);
      } else {
        setSnackbar({ open: true, message: `${successCount} guardados, ${errorCount} fallaron`, severity: 'warning' });
      }
    } catch (err) {
      console.error('Error saving changes:', err);
      setSnackbar({ open: true, message: 'Error al guardar los cambios', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProduct) {
      setSnackbar({ open: true, message: 'Seleccioná un producto', severity: 'warning' });
      return;
    }

    if (products.some(p => p.producto?.id === selectedProduct.id)) {
      setSnackbar({ open: true, message: 'Este producto ya está en la lista', severity: 'warning' });
      return;
    }

    // Validar que todos los tipos de venta tengan precio
    const tipoVentaIds = [...new Set(products.map(p => p.tipo_venta?.id).filter(Boolean))];
    if (tipoVentaIds.length === 0) {
      setSnackbar({ open: true, message: 'La lista no tiene tipos de venta definidos', severity: 'error' });
      return;
    }

    const allFilled = tipoVentaIds.every(tvId => {
      const val = newPrices[tvId];
      return val && parseFloat(val) > 0;
    });

    if (!allFilled) {
      setSnackbar({ open: true, message: 'Completá el precio para todos los tipos de venta', severity: 'warning' });
      return;
    }

    try {
      const responses = await Promise.all(
        tipoVentaIds.map(tvId =>
          axios.post(priceListProductUrl, {
            lista_precios: parseInt(id),
            producto: selectedProduct.id,
            tipo_venta: tvId,
            precio: parseFloat(newPrices[tvId]),
          })
        )
      );

      setProducts([...products, ...responses.map(r => r.data)]);
      setOriginalProducts([...originalProducts, ...responses.map(r => r.data)]);
      setOpenAddDialog(false);
      setSelectedProduct(null);
      setNewPrices({});
      setSnackbar({ open: true, message: 'Producto agregado correctamente', severity: 'success' });
    } catch (err) {
      console.error('Error adding product:', err);
      setSnackbar({ open: true, message: err.response?.data?.error || 'Error al agregar el producto', severity: 'error' });
    }
  };

  const handleBack = () => {
    if (hasChanges && !window.confirm('Tenés cambios sin guardar. ¿Querés salir de todas formas?')) {
      return;
    }
    navigate(`/price-list/detail/${id}`);
  };

  const hasProductChanged = (productId) => {
    const currentItems = products.filter(p => p.producto?.id === productId);
    return currentItems.some(item => {
      const original = originalProducts.find(p => p.id === item.id);
      return original && String(item.precio) !== String(original.precio);
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Cargando...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <div className="container mx-auto h-full flex flex-col rounded p-4">
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ flex: 1, mr: 3 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
                Editar Lista de Precios
              </Typography>

              <TextField
                label="Nombre de la lista"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                inputProps={{ maxLength: 30 }}
                helperText={`${listName.length}/30 caracteres`}
              />

              <TextField
                label="Descripción"
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                fullWidth
                multiline
                rows={2}
                inputProps={{ maxLength: 200 }}
                helperText={`${listDescription.length}/200 caracteres`}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 200 }}>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setOpenAddDialog(true)}
                color="primary"
                variant="contained"
                fullWidth
              >
                Agregar Producto
              </Button>

              <Button
                startIcon={<SaveIcon />}
                onClick={handleSaveChanges}
                color="success"
                variant="contained"
                disabled={!hasChanges || saving}
                fullWidth
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>

              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                color="secondary"
                variant="outlined"
                fullWidth
              >
                Volver
              </Button>
            </Box>
          </Box>

          {hasChanges && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Tenés cambios sin guardar. Recordá hacer click en "Guardar Cambios".
            </Alert>
          )}
        </Paper>

        {/* Tabla editable */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold">
              Productos ({new Set(products.map(p => p.producto?.id).filter(Boolean)).size})
            </Typography>
          </Box>

          {products.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Esta lista no tiene productos asociados. Hacé click en "Agregar Producto" para comenzar.
              </Typography>
            </Box>
          ) : (() => {
            // Columnas dinámicas por tipo_venta
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
              const prodId = item.producto?.id;
              if (!prodId) return;
              if (!rowMap[prodId]) {
                rowMap[prodId] = { producto: item.producto, items: {} };
              }
              if (item.tipo_venta) {
                rowMap[prodId].items[item.tipo_venta.id] = item;
              }
            });
            const rows = Object.values(rowMap).sort((a, b) => {
              const catA = a.producto.categoria?.descripcion || '';
              const catB = b.producto.categoria?.descripcion || '';
              const catCmp = catA.localeCompare(catB);
              return catCmp !== 0 ? catCmp : a.producto.descripcion.localeCompare(b.producto.descripcion);
            });

            const getAbreviacion = (producto, tipoVenta) => {
              const desc = tipoVenta?.descripcion?.toLowerCase();
              if (desc === 'unidad') return producto?.tipo_unidad?.abreviacion || '';
              if (desc === 'bulto')  return producto?.tipo_contenedor?.abreviacion || '';
              return '';
            };

            return (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Categoría</TableCell>
                      {tipoVentaColumns.map(tv => (
                        <TableCell key={tv.id} sx={{ fontWeight: 'bold' }}>
                          {tv.descripcion}
                        </TableCell>
                      ))}
                      <TableCell sx={{ fontWeight: 'bold' }}>Peso Aprox.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const changed = hasProductChanged(row.producto.id);
                      return (
                        <TableRow
                          key={row.producto.id}
                          sx={{
                            bgcolor: changed ? '#E3F2FD' : 'inherit',
                            '&:hover': { bgcolor: changed ? '#BBDEFB' : 'grey.50' }
                          }}
                        >
                          <TableCell>{row.producto.descripcion}</TableCell>
                          <TableCell>{row.producto.categoria?.descripcion || '—'}</TableCell>
                          {tipoVentaColumns.map(tv => {
                            const entry = row.items[tv.id];
                            return (
                              <TableCell key={tv.id}>
                                {entry ? (
                                  <TextField
                                    type="text"
                                    value={entry.precio}
                                    onChange={(e) => handlePriceChange(row.producto.id, tv.id, e.target.value)}
                                    size="small"
                                    fullWidth
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    InputProps={{
                                      startAdornment: <span style={{ marginRight: '4px' }}>$</span>,
                                      endAdornment: <span style={{ marginLeft: '4px', color: '#666', fontSize: '0.85em', whiteSpace: 'nowrap' }}>{getAbreviacion(row.producto, tv)}</span>,
                                    }}
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.disabled">—</Typography>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <span style={{ color: '#666' }}>
                              {row.producto.cantidad_por_bulto || '—'} {row.producto.tipo_unidad?.abreviacion || ''}
                            </span>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteProduct(row.producto.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}
        </Paper>
      </Box>

      {/* Dialog para agregar producto */}
      <Dialog open={openAddDialog} onClose={() => { setOpenAddDialog(false); setSelectedProduct(null); setNewPrices({}); }} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Producto a la Lista</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Autocomplete
              options={allProducts}
              getOptionLabel={(option) => `${option.descripcion} (${option.categoria?.descripcion || 'Sin categoría'})`}
              value={selectedProduct}
              onChange={(_, newValue) => setSelectedProduct(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Producto" placeholder="Buscá un producto" />
              )}
            />
            {/* Un campo de precio por cada tipo de venta existente en la lista */}
            {[...new Set(products.map(p => p.tipo_venta?.id).filter(Boolean))]
              .map(tvId => saleTypes.find(st => st.id === tvId))
              .filter(Boolean)
              .sort((a, b) => a.id - b.id)
              .map(tv => (
                <TextField
                  key={tv.id}
                  label={`Precio ${tv.descripcion}`}
                  type="text"
                  value={newPrices[tv.id] || ''}
                  onChange={(e) => {
                    if (!e.target.value || /^\d*\.?\d*$/.test(e.target.value)) {
                      setNewPrices(prev => ({ ...prev, [tv.id]: e.target.value }));
                    }
                  }}
                  fullWidth
                  InputProps={{
                    startAdornment: <span style={{ marginRight: '4px' }}>$</span>,
                  }}
                />
              ))
            }
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenAddDialog(false); setSelectedProduct(null); setNewPrices({}); }} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleAddProduct} variant="contained" color="primary">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de eliminar este producto de la lista de precios?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setOpenDeleteDialog(false)}
            variant="outlined"
            color="primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteProduct}
            variant="contained"
            color="error"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default PriceListEdit;
