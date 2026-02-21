import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { priceListUrl, priceListProductUrl, productUrl } from '../constants/urls';

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
  Snackbar
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newPriceUnit, setNewPriceUnit] = useState('');
  const [newPriceBulk, setNewPriceBulk] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [originalListName, setOriginalListName] = useState('');
  const [originalListDescription, setOriginalListDescription] = useState('');
  const [listMetadataChanged, setListMetadataChanged] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener la lista de precios
        const listResponse = await axios.get(`${priceListUrl}${id}/`);
        setPriceList(listResponse.data);
        setListName(listResponse.data.nombre);
        setListDescription(listResponse.data.descripcion);
        setOriginalListName(listResponse.data.nombre);
        setOriginalListDescription(listResponse.data.descripcion);

        // Obtener productos de la lista
        const productsResponse = await axios.get(`${priceListProductUrl}?price_list=${id}`);
        const fetchedProducts = productsResponse.data;
        setProducts(fetchedProducts);
        setOriginalProducts(JSON.parse(JSON.stringify(fetchedProducts))); // Deep clone

        // Obtener todos los productos para el selector
        const allProductsResponse = await axios.get(productUrl);
        setAllProducts(allProductsResponse.data);

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
      return (
        String(product.precio_unitario) !== String(original.precio_unitario) ||
        String(product.precio_bulto) !== String(original.precio_bulto)
      );
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

  const handlePriceChange = (index, field, value) => {
    // Solo permitir números y punto decimal
    if (value && !/^\d*\.?\d*$/.test(value)) return;

    const updatedProducts = [...products];
    updatedProducts[index][field] = value;
    setProducts(updatedProducts);
  };

  const handleDeleteProduct = async (index, productId) => {
    setProductToDelete({ index, productId });
    setOpenDeleteDialog(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    const { index, productId } = productToDelete;

    try {
      await axios.delete(`${priceListProductUrl}${productId}/`);
      // Eliminar de ambos estados
      const updatedProducts = products.filter((_, i) => i !== index);
      const updatedOriginalProducts = originalProducts.filter(p => p.id !== productId);
      setProducts(updatedProducts);
      setOriginalProducts(updatedOriginalProducts);
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
      // Primero, guardar cambios en metadatos de la lista si hay cambios
      if (listMetadataChanged) {
        try {
          await axios.patch(`${priceListUrl}${id}/`, {
            nombre: listName,
            descripcion: listDescription,
          });
          setOriginalListName(listName);
          setOriginalListDescription(listDescription);
          setPriceList(prev => ({
            ...prev,
            nombre: listName,
            descripcion: listDescription
          }));
          successCount++;
        } catch (err) {
          console.error('Error actualizando metadatos:', err);
          if (err.response?.data?.error) {
            setSnackbar({ 
              open: true, 
              message: err.response.data.error, 
              severity: 'error' 
            });
          } else {
            setSnackbar({ 
              open: true, 
              message: 'Error al actualizar el nombre/descripción', 
              severity: 'error' 
            });
          }
          errorCount++;
          setSaving(false);
          return;
        }
      }

      // Validar todos los precios
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (!product.precio_unitario || parseFloat(product.precio_unitario) <= 0) {
          setSnackbar({ open: true, message: `El precio unitario debe ser mayor a 0 (fila ${i + 1})`, severity: 'error' });
          setSaving(false);
          return;
        }
        if (!product.precio_bulto || parseFloat(product.precio_bulto) <= 0) {
          setSnackbar({ open: true, message: `El precio por bulto debe ser mayor a 0 (fila ${i + 1})`, severity: 'error' });
          setSaving(false);
          return;
        }
      }

      // Enviar PATCH para cada producto modificado
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const original = originalProducts.find(p => p.id === product.id);

        if (original && (
          String(product.precio_unitario) !== String(original.precio_unitario) ||
          String(product.precio_bulto) !== String(original.precio_bulto)
        )) {
          try {
            await axios.patch(`${priceListProductUrl}${product.id}/`, {
              precio_unitario: parseFloat(product.precio_unitario),
              precio_bulto: parseFloat(product.precio_bulto)
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
        setOriginalProducts(JSON.parse(JSON.stringify(products))); // Actualizar estado original
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
    if (!selectedProduct || !newPriceUnit || !newPriceBulk) {
      setSnackbar({ open: true, message: 'Completá todos los campos', severity: 'warning' });
      return;
    }

    if (parseFloat(newPriceUnit) <= 0 || parseFloat(newPriceBulk) <= 0) {
      setSnackbar({ open: true, message: 'Los precios deben ser mayores a 0', severity: 'error' });
      return;
    }

    // Verificar si el producto ya está en la lista
    if (products.some(p => p.producto?.id === selectedProduct.id)) {
      setSnackbar({ open: true, message: 'Este producto ya está en la lista', severity: 'warning' });
      return;
    }

    try {
      const response = await axios.post(priceListProductUrl, {
        lista_precios: parseInt(id),
        producto: selectedProduct.id,
        precio_unitario: parseFloat(newPriceUnit),
        precio_bulto: parseFloat(newPriceBulk)
      });

      setProducts([...products, response.data]);
      setOriginalProducts([...originalProducts, response.data]);
      setOpenAddDialog(false);
      setSelectedProduct(null);
      setNewPriceUnit('');
      setNewPriceBulk('');
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
    const current = products.find(p => p.id === productId);
    const original = originalProducts.find(p => p.id === productId);
    if (!original || !current) return false;
    return (
      String(current.precio_unitario) !== String(original.precio_unitario) ||
      String(current.precio_bulto) !== String(original.precio_bulto)
    );
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
              Productos ({products.length})
            </Typography>
          </Box>

          {products.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Esta lista no tiene productos asociados. Hacé click en "Agregar Producto" para comenzar.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold', width: '28%' }}>Producto</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '16%' }}>Categoría</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Precio Unitario</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Precio Bulto</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Peso Aprox.</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '10%', textAlign: 'center' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((item, index) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        bgcolor: hasProductChanged(item.id) ? '#E3F2FD' : 'inherit',
                        '&:hover': { bgcolor: hasProductChanged(item.id) ? '#BBDEFB' : 'grey.50' }
                      }}
                    >
                      <TableCell>{item.producto?.descripcion || '—'}</TableCell>
                      <TableCell>{item.producto?.categoria?.descripcion || '—'}</TableCell>
                      <TableCell>
                        <TextField
                          type="text"
                          value={item.precio_unitario}
                          onChange={(e) => handlePriceChange(index, 'precio_unitario', e.target.value)}
                          size="small"
                          fullWidth
                          inputProps={{ style: { textAlign: 'right' } }}
                          InputProps={{
                            startAdornment: <span style={{ marginRight: '4px' }}>$</span>,
                            endAdornment: <span style={{ marginLeft: '4px', color: '#666' }}>{item.producto?.tipo_unidad?.abreviacion || ''}</span>
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="text"
                          value={item.precio_bulto}
                          onChange={(e) => handlePriceChange(index, 'precio_bulto', e.target.value)}
                          size="small"
                          fullWidth
                          inputProps={{ style: { textAlign: 'right' } }}
                          InputProps={{
                            startAdornment: <span style={{ marginRight: '4px' }}>$</span>,
                            endAdornment: <span style={{ marginLeft: '4px', color: '#666' }}>{item.producto?.tipo_contenedor?.abreviacion || ''}</span>
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <span style={{ color: '#666' }}>
                          {item.producto?.cantidad_por_bulto || '—'} {item.producto?.tipo_unidad?.abreviacion || ''}
                        </span>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteProduct(index, item.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Dialog para agregar producto */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Producto a la Lista</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Autocomplete
              options={allProducts}
              getOptionLabel={(option) => `${option.descripcion} (${option.categoria?.descripcion || 'Sin categoría'})`}
              value={selectedProduct}
              onChange={(event, newValue) => setSelectedProduct(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Producto" placeholder="Buscá un producto" />
              )}
            />
            <TextField
              label="Precio Unitario"
              type="text"
              value={newPriceUnit}
              onChange={(e) => {
                if (!e.target.value || /^\d*\.?\d*$/.test(e.target.value)) {
                  setNewPriceUnit(e.target.value);
                }
              }}
              fullWidth
            />
            <TextField
              label="Precio Bulto"
              type="text"
              value={newPriceBulk}
              onChange={(e) => {
                if (!e.target.value || /^\d*\.?\d*$/.test(e.target.value)) {
                  setNewPriceBulk(e.target.value);
                }
              }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)} color="primary">
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
