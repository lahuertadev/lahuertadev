import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { priceListUrl, priceListProductUrl, productUrl, saleTypeUrl } from '../../../constants/urls';

import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Alert,
  Snackbar,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import CustomInput from '../../../components/Input';
import AmountInput from '../../../components/AmountInput';
import BackButton from '../../../components/BackButton';
import FieldWarning from '../../../components/FieldWarning';
import SpotlightButton from '../../../components/SpotlightButton';
import DataGridDemo from '../../../components/Grid';
import AssignClientsDialog from '../shared/AssignClientsDialog';
import { useToast } from '../../../context/ToastContext';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import {
  SALE_TYPE_BULK,
  SALE_TYPE_UNIT,
  findSaleType,
  getSuggestedUnitPrice,
  getUnitAbbreviation,
  isSamePrice,
  isSaleType,
  sortSaleTypes,
} from '../../../utils/priceList';

const PriceListEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const { showToast } = useToast();

  // La edición de listas de precios (grilla de precios por producto) no entra cómoda en mobile.
  // Ahí mandamos al detalle, que ya tiene nombre/descripción, tabla de solo lectura y el botón
  // de descargar PDF — la forma recomendada de consultar la lista desde el celular.
  useEffect(() => {
    if (isMobile) {
      navigate(`/price-list/detail/${id}`, { replace: true });
    }
  }, [isMobile, id, navigate]);

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
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newPrices, setNewPrices] = useState({});
  // Productos cuyo precio por unidad se editó a mano: cambiar el bulto ya no lo pisa con la sugerencia.
  const [editedUnitPriceProductIds, setEditedUnitPriceProductIds] = useState(new Set());
  const [newUnitPriceEdited, setNewUnitPriceEdited] = useState(false);
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

        // Completar, para cada producto ya presente en la lista, un "placeholder" editable
        // (sin id real todavía) por cada tipo de venta del catálogo que ese producto no tenga
        // cargado. Así Unidad y Bulto quedan siempre disponibles para completar, aunque la lista
        // solo haya tenido precios de un tipo de venta hasta ahora.
        const fetchedProducts = productsRes.data;
        const saleTypesList = saleTypesRes.data;

        const existingKeys = new Set(fetchedProducts.map(p => `${p.producto?.id}-${p.tipo_venta?.id}`));
        const productosEnLista = new Map();
        fetchedProducts.forEach(p => {
          if (p.producto?.id) productosEnLista.set(p.producto.id, p.producto);
        });

        const placeholders = [];
        productosEnLista.forEach((producto, productoId) => {
          saleTypesList.forEach(tv => {
            if (!existingKeys.has(`${productoId}-${tv.id}`)) {
              placeholders.push({ id: `new-${productoId}-${tv.id}`, producto, tipo_venta: tv, precio: '' });
            }
          });
        });

        const fullProducts = [...fetchedProducts, ...placeholders];

        setProducts(fullProducts);
        setOriginalProducts(JSON.parse(JSON.stringify(fullProducts)));

        setAllProducts(allProductsRes.data);
        setSaleTypes(saleTypesList);

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
      return !isSamePrice(product.precio, original.precio);
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

  const bulkSaleType = findSaleType(saleTypes, SALE_TYPE_BULK);
  const unitSaleType = findSaleType(saleTypes, SALE_TYPE_UNIT);

  const handlePriceChange = (productId, saleTypeId, value) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return;

    // AmountInput re-emite el valor normalizado al salir del campo: si el número no cambió,
    // solo se actualiza el texto, sin marcar edición manual ni recalcular la unidad.
    const currentEntry = products.find(item => item.producto?.id === productId && item.tipo_venta?.id === saleTypeId);
    if (currentEntry && isSamePrice(currentEntry.precio, value)) {
      setProducts(prev => prev.map(item => (item === currentEntry ? { ...item, precio: value } : item)));
      return;
    }

    const isBulkChange = saleTypeId === bulkSaleType?.id;
    const isUnitChange = saleTypeId === unitSaleType?.id;
    const shouldSuggestUnitPrice = isBulkChange && !editedUnitPriceProductIds.has(productId);

    if (isUnitChange) {
      // Si se vacía el precio por unidad, vuelve a quedar a cargo de la sugerencia.
      setEditedUnitPriceProductIds(prev => {
        const next = new Set(prev);
        if (value === '') next.delete(productId);
        else next.add(productId);
        return next;
      });
    }

    setProducts(prev =>
      prev.map(item => {
        if (item.producto?.id !== productId) return item;
        if (item.tipo_venta?.id === saleTypeId) return { ...item, precio: value };
        if (shouldSuggestUnitPrice && isSaleType(item.tipo_venta, SALE_TYPE_UNIT)) {
          // Sin sugerencia posible (bulto vacío o producto sin peso/cantidad) se conserva el valor actual.
          return { ...item, precio: getSuggestedUnitPrice(value, item.producto) || item.precio };
        }
        return item;
      })
    );
  };

  const closeAddDialog = () => {
    setOpenAddDialog(false);
    setSelectedProduct(null);
    setNewPrices({});
    setNewUnitPriceEdited(false);
  };

  // Diálogo "Agregar Producto": misma sugerencia de precio por unidad que en la grilla.
  const handleNewPriceChange = (saleTypeId, value) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return;

    if (saleTypeId === unitSaleType?.id) {
      // AmountInput re-emite el mismo valor al salir del campo: eso no cuenta como edición manual.
      if (!isSamePrice(newPrices[saleTypeId], value)) setNewUnitPriceEdited(value !== '');
      setNewPrices(prev => ({ ...prev, [saleTypeId]: value }));
      return;
    }

    setNewPrices(prev => {
      const next = { ...prev, [saleTypeId]: value };
      if (saleTypeId === bulkSaleType?.id && unitSaleType && !newUnitPriceEdited) {
        next[unitSaleType.id] = getSuggestedUnitPrice(value, selectedProduct) || prev[unitSaleType.id];
      }
      return next;
    });
  };

  const handleSelectedProductChange = (product) => {
    setSelectedProduct(product);
    if (bulkSaleType && unitSaleType && !newUnitPriceEdited) {
      setNewPrices(prev => ({
        ...prev,
        [unitSaleType.id]: getSuggestedUnitPrice(prev[bulkSaleType.id], product) || prev[unitSaleType.id],
      }));
    }
  };

  const handleDeleteProduct = (productId) => {
    setProductToDelete({ productId });
    setOpenDeleteDialog(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const { productId } = productToDelete;
    // Eliminar todos los registros reales (uno por tipo_venta) del producto en esta lista.
    // Los placeholders (id string, nunca guardados) no existen en el servidor: se descartan
    // solo del estado local, sin pegarle a la API.
    const itemsToDelete = products.filter(p => p.producto?.id === productId && typeof p.id === 'number');
    try {
      await Promise.all(itemsToDelete.map(item => axios.delete(`${priceListProductUrl}${item.id}/`)));
      setProducts(prev => prev.filter(p => p.producto?.id !== productId));
      setOriginalProducts(prev => prev.filter(p => p.producto?.id !== productId));
      showToast('El producto se eliminó de la lista correctamente.');
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
    const updatedProducts = [...products];

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

      // Los placeholders (fila sin id real, precio todavía vacío) no se validan ni se guardan
      // si nunca se tocaron. Si se completaron, sí tienen que ser > 0 como cualquier precio.
      for (let i = 0; i < updatedProducts.length; i++) {
        const product = updatedProducts[i];
        const isPlaceholder = typeof product.id === 'string';
        if (isPlaceholder && !product.precio) continue;
        if (!product.precio || parseFloat(product.precio) <= 0) {
          setSnackbar({ open: true, message: `El precio debe ser mayor a 0 (fila ${i + 1})`, severity: 'error' });
          setSaving(false);
          return;
        }
      }

      for (let i = 0; i < updatedProducts.length; i++) {
        const product = updatedProducts[i];
        const isPlaceholder = typeof product.id === 'string';

        if (isPlaceholder) {
          if (!product.precio) continue;
          try {
            const res = await axios.post(priceListProductUrl, {
              lista_precios: parseInt(id),
              producto: product.producto.id,
              tipo_venta: product.tipo_venta.id,
              precio: parseFloat(product.precio),
            });
            updatedProducts[i] = res.data;
            successCount++;
          } catch (err) {
            console.error(`Error creando precio para producto ${product.producto.id}:`, err);
            errorCount++;
          }
          continue;
        }

        const original = originalProducts.find(p => p.id === product.id);
        if (original && !isSamePrice(product.precio, original.precio)) {
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

      setProducts(updatedProducts);
      if (errorCount === 0) {
        showToast('La lista de precios se actualizó correctamente.');
        setOriginalProducts(JSON.parse(JSON.stringify(updatedProducts)));
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
      closeAddDialog();
      showToast('El producto se agregó a la lista correctamente.');
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
      return original && !isSamePrice(item.precio, original.precio);
    });
  };

  if (isMobile) {
    // El useEffect de arriba ya está redirigiendo al detalle; no renderizamos el form de escritorio.
    return null;
  }

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
    <div className="w-full max-w-7xl mx-auto pb-12">
      <Box sx={{ width: '100%' }}>
        {/* Encabezado + información general en una misma card, para que el título no quede suelto */}
        <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle mb-6">
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border-subtle">
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent">Lista de precios</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface">Editar lista</h1>
              <p className="mt-1 text-sm text-on-surface-muted">Modificá el nombre, la descripción o los precios de los productos.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <SpotlightButton variant="outline" onClick={() => setOpenAssignDialog(true)} className="px-5 py-2.5 text-sm">
                <GroupAddOutlinedIcon sx={{ fontSize: 18 }} />
                Asignar a clientes
              </SpotlightButton>
              <BackButton onClick={handleBack} className="px-5 py-2.5 text-sm" />
            </div>
          </div>

          <div className="p-6 space-y-4">
            <CustomInput
              label="Nombre de la lista"
              name="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              maxLength={30}
              hint={`${listName.length}/30 caracteres`}
            />
            <CustomInput
              label="Descripción"
              name="listDescription"
              value={listDescription}
              onChange={(e) => setListDescription(e.target.value)}
              multiline
              maxLength={200}
              hint={`${listDescription.length}/200 caracteres`}
            />
          </div>
        </div>

        {/* Tabla editable */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Productos ({new Set(products.map(p => p.producto?.id).filter(Boolean)).size})
            </Typography>
            <SpotlightButton variant="outline" onClick={() => setOpenAddDialog(true)} className="px-5 py-2.5 text-sm">
              <AddIcon fontSize="small" />
              Agregar producto
            </SpotlightButton>
          </Box>

          {products.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Esta lista no tiene productos asociados. Hacé click en "Agregar Producto" para comenzar.
              </Typography>
            </Box>
          ) : (() => {
            // Columnas de precio: una por cada tipo_venta del catálogo (Bulto, Unidad, etc.),
            // no solo los que ya tienen algún precio cargado en esta lista puntual.
            const tipoVentaColumns = sortSaleTypes(saleTypes);

            // Pivot: una fila por producto
            const rowMap = {};
            products.forEach(item => {
              const prodId = item.producto?.id;
              if (!prodId) return;
              if (!rowMap[prodId]) {
                rowMap[prodId] = {
                  id: prodId,
                  producto: item.producto,
                  descripcion: item.producto.descripcion,
                  pesoAprox: `${item.producto.peso_aproximado ?? item.producto.cantidad_por_bulto ?? '—'} ${item.producto.tipo_unidad?.abreviacion || ''}`.trim(),
                  items: {},
                };
              }
              if (item.tipo_venta) {
                rowMap[prodId].items[item.tipo_venta.id] = item;
              }
            });
            // Orden alfabético por producto (la categoría no se muestra en la edición).
            const rows = Object.values(rowMap).sort((a, b) => a.producto.descripcion.localeCompare(b.producto.descripcion));

            const columns = [
              { field: 'descripcion', headerName: 'Producto', flex: 1, align: 'center', headerAlign: 'center' },
              ...tipoVentaColumns.map(tv => ({
                field: `precio_${tv.id}`,
                headerName: `Precio ${tv.descripcion}`,
                minWidth: 180,
                flex: 1,
                sortable: false,
                align: 'center',
                headerAlign: 'center',
                renderCell: (params) => {
                  const entry = params.row.items[tv.id];
                  if (!entry) return <Typography variant="body2" color="text.disabled">—</Typography>;
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
                      <AmountInput
                        name={`precio_${params.row.producto.id}_${tv.id}`}
                        value={entry.precio}
                        onChange={(raw) => handlePriceChange(params.row.producto.id, tv.id, raw)}
                        suffix={getUnitAbbreviation(params.row.producto, tv)}
                      />
                    </Box>
                  );
                },
              })),
              { field: 'pesoAprox', headerName: 'Peso Aprox. / Cantidad', width: 150, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
            ];

            return (
              <div className="overflow-x-auto">
                <DataGridDemo
                  rows={rows}
                  columns={columns}
                  multiSelect={false}
                  showEdit={false}
                  onDelete={handleDeleteProduct}
                  getRowClassName={(params) => (hasProductChanged(params.row.id) ? 'row-highlighted' : '')}
                  pageSize={20}
                  pageSizeOptions={[10, 20, 25, 50]}
                />
              </div>
            );
          })()}
        </Paper>

        {/* Acciones: mismo patrón que los formularios de Compras */}
        <div className="flex flex-col items-center gap-3 mt-6 pt-4 border-t border-border-subtle">
          {hasChanges && <FieldWarning>Tenés cambios sin guardar.</FieldWarning>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <SpotlightButton variant="cancel" onClick={handleBack} className="w-full sm:w-auto px-6 py-2.5 text-sm">
              Cancelar
            </SpotlightButton>
            <SpotlightButton
              variant="primary"
              onClick={handleSaveChanges}
              disabled={!hasChanges || saving}
              className="w-full sm:w-auto sm:min-w-[10rem] px-6 py-2.5 text-sm"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </SpotlightButton>
          </div>
        </div>
      </Box>

      {/* Dialog para agregar producto */}
      <Dialog open={openAddDialog} onClose={closeAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Producto a la Lista</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Autocomplete
              options={allProducts}
              getOptionLabel={(option) => `${option.descripcion} (${option.categoria?.descripcion || 'Sin categoría'})`}
              value={selectedProduct}
              onChange={(_, newValue) => handleSelectedProductChange(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Producto" placeholder="Buscá un producto" />
              )}
            />
            {/* Un campo de precio por cada tipo de venta existente en la lista */}
            {sortSaleTypes(
              [...new Set(products.map(p => p.tipo_venta?.id).filter(Boolean))]
                .map(tvId => saleTypes.find(st => st.id === tvId))
                .filter(Boolean)
            ).map(tv => (
                <div key={tv.id}>
                  <label className="block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5">
                    Precio {tv.descripcion}
                  </label>
                  <AmountInput
                    name={`nuevo_precio_${tv.id}`}
                    value={newPrices[tv.id] || ''}
                    onChange={(raw) => handleNewPriceChange(tv.id, raw)}
                    suffix={getUnitAbbreviation(selectedProduct, tv)}
                  />
                </div>
              ))
            }
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <SpotlightButton variant="cancel" onClick={closeAddDialog} className="px-5 py-2.5 text-sm">
            Cancelar
          </SpotlightButton>
          <SpotlightButton variant="primary" onClick={handleAddProduct} className="px-5 py-2.5 text-sm">
            Agregar
          </SpotlightButton>
        </DialogActions>
      </Dialog>

      <AssignClientsDialog
        open={openAssignDialog}
        priceList={{ id: Number(id), nombre: listName }}
        onClose={() => setOpenAssignDialog(false)}
        onAssigned={(assigned) =>
          showToast(`La lista se asignó a ${assigned} cliente${assigned === 1 ? '' : 's'} correctamente.`)
        }
      />

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
