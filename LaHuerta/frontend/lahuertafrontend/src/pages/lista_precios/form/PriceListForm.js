import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import { priceListUrl, priceListProductUrl, productUrl, saleTypeUrl } from '../../../constants/urls';
import CustomInput from '../../../components/Input';
import BasicSelect from '../../../components/Select';
import AmountInput from '../../../components/AmountInput';
import Toast from '../../../components/Toast';
import { useToast } from '../../../context/ToastContext';
import FieldWarning from '../../../components/FieldWarning';
import SpotlightButton from '../../../components/SpotlightButton';
import BackButton from '../../../components/BackButton';
import {
  SALE_TYPE_BULK,
  SALE_TYPE_UNIT,
  findSaleType,
  getSuggestedUnitPrice,
  getUnitAbbreviation,
} from '../../../utils/priceList';

// Una fila por producto, con un precio por cada tipo de venta (Bulto y Unidad).
// unitPriceEdited marca que el precio por unidad se tocó a mano: a partir de ahí
// cambiar el precio del bulto ya no lo pisa con la sugerencia.
const EMPTY_ITEM = {
  product: null,
  bulkPrice: '',
  unitPrice: '',
  unitPriceEdited: false,
};

// Límites del backend (ListaPrecios.nombre max_length=30, descripcion max_length=200).
const NAME_MAX_LENGTH = 30;
const DESCRIPTION_MAX_LENGTH = 200;
const NAME_REGEX = new RegExp(`^[\\s\\S]{0,${NAME_MAX_LENGTH}}$`);
const DESCRIPTION_REGEX = new RegExp(`^[\\s\\S]{0,${DESCRIPTION_MAX_LENGTH}}$`);

const DUPLICATED_NAME_MESSAGE = 'Ya existe una lista de precios con este nombre.';

// El nombre de la lista es único en el backend, que además lo guarda capitalizado y sin espacios
// repetidos: se compara sin mayúsculas, sin espacios extremos y con los espacios internos colapsados.
const normalizeListName = (name) => (name || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Label chico en mayúsculas, mismo patrón que ya usan CustomInput/BasicSelect en el resto del sitio.
const mobileLabelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1';

const SectionCard = ({ icon, title, children }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
    </div>
    <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle">
      {children}
    </div>
  </section>
);

const PriceListForm = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const { showToast } = useToast();

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const [products, setProducts] = useState([]);
  const [saleTypes, setSaleTypes] = useState([]);
  const [existingListNames, setExistingListNames] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, message: '' });

  useEffect(() => {
    const loadOptions = async () => {
      const [productsResponse, saleTypesResponse, priceListsResponse] = await Promise.all([
        axios.get(productUrl),
        axios.get(saleTypeUrl),
        axios.get(priceListUrl),
      ]);
      setProducts(productsResponse.data);
      setSaleTypes(saleTypesResponse.data);
      setExistingListNames(priceListsResponse.data.map((priceList) => normalizeListName(priceList.nombre)));
    };
    loadOptions().catch(console.error);
  }, []);

  // ── Helpers de filas ───────────────────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  // Aplica los cambios a la fila y devuelve la fila resultante a partir de la anterior.
  const updateItem = (index, buildItem) =>
    setItems((prev) => prev.map((item, i) => (i === index ? buildItem(item) : item)));

  // Mientras el precio por unidad no se haya editado a mano, se recalcula con la
  // sugerencia cada vez que cambia el producto o el precio del bulto. Sin sugerencia
  // posible (bulto vacío o producto sin peso/cantidad) se conserva el valor actual.
  const withSuggestedUnitPrice = (item) =>
    item.unitPriceEdited
      ? item
      : { ...item, unitPrice: getSuggestedUnitPrice(item.bulkPrice, item.product) || item.unitPrice };

  const handleProductChange = (index, product) =>
    updateItem(index, (item) => withSuggestedUnitPrice({ ...item, product }));

  const handleBulkPriceChange = (index, bulkPrice) =>
    updateItem(index, (item) => withSuggestedUnitPrice({ ...item, bulkPrice }));

  // Si se vacía el precio por unidad, vuelve a quedar a cargo de la sugerencia.
  // AmountInput re-emite el mismo valor normalizado en el blur: eso no cuenta como edición manual.
  const handleUnitPriceChange = (index, unitPrice) =>
    updateItem(index, (item) =>
      parseFloat(unitPrice) === parseFloat(item.unitPrice)
        ? { ...item, unitPrice }
        : { ...item, unitPrice, unitPriceEdited: unitPrice !== '' }
    );

  // ── Auto-agregar fila ──────────────────────────────────────────────
  useEffect(() => {
    const last = items[items.length - 1];
    if (last.product && parseFloat(last.bulkPrice) > 0 && parseFloat(last.unitPrice) > 0) {
      setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
    }
  }, [items]);

  // ── Validación ─────────────────────────────────────────────────────
  const isDuplicatedName = existingListNames.includes(normalizeListName(nombre));

  const validate = () => {
    const nextErrors = {};

    if (!nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio';
    else if (!NAME_REGEX.test(nombre)) nextErrors.nombre = `El nombre no puede exceder los ${NAME_MAX_LENGTH} caracteres`;
    else if (isDuplicatedName) nextErrors.nombreDuplicated = DUPLICATED_NAME_MESSAGE;

    if (!DESCRIPTION_REGEX.test(descripcion)) nextErrors.descripcion = `La descripción no puede exceder los ${DESCRIPTION_MAX_LENGTH} caracteres`;

    items.forEach((item, index) => {
      if (!item.product) return;
      if (!(parseFloat(item.bulkPrice) > 0)) nextErrors[`item_${index}_bulkPrice`] = 'Requerido';
      if (!(parseFloat(item.unitPrice) > 0)) nextErrors[`item_${index}_unitPrice`] = 'Requerido';
    });

    return nextErrors;
  };

  const isFormComplete = Object.keys(validate()).length === 0;

  // ── Productos ya elegidos en otra fila (cada producto va en una sola fila) ──
  const getAvailableProducts = (index) => {
    const usedProductIds = new Set(
      items.filter((item, i) => i !== index && item.product).map((item) => item.product.id)
    );
    return products.filter((product) => !usedProductIds.has(product.id));
  };

  const bulkSaleType = findSaleType(saleTypes, SALE_TYPE_BULK);
  const unitSaleType = findSaleType(saleTypes, SALE_TYPE_UNIT);

  // ── Guardar ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    if (!bulkSaleType || !unitSaleType) {
      setToast({ open: true, message: 'No se encontraron los tipos de venta Bulto y Unidad.' });
      return;
    }

    setSaving(true);

    try {
      const listResponse = await axios.post(priceListUrl, {
        nombre,
        descripcion: descripcion || '',
      });
      const newListId = listResponse.data.id;

      // Cada fila genera dos registros de ListaPreciosProducto: uno para Bulto y otro para Unidad.
      const filledItems = items.filter((item) => item.product);
      await Promise.all(
        filledItems.flatMap((item) => [
          axios.post(priceListProductUrl, {
            lista_precios: newListId,
            producto: item.product.id,
            tipo_venta: bulkSaleType.id,
            precio: parseFloat(item.bulkPrice),
          }),
          axios.post(priceListProductUrl, {
            lista_precios: newListId,
            producto: item.product.id,
            tipo_venta: unitSaleType.id,
            precio: parseFloat(item.unitPrice),
          }),
        ])
      );

      showToast('La lista de precios se creó correctamente.');
      navigate(`/price-list/detail/${newListId}`);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        'Error al guardar la lista de precios.';
      setToast({ open: true, message: typeof message === 'string' ? message : JSON.stringify(message) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ open: false, message: '' })}
      />

      {/* Breadcrumbs + Volver arriba a la derecha, como en Editar lista y Detalle */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
          <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
          <span className="text-xs">›</span>
          <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/price-list')}>Lista de Precios</span>
          <span className="text-xs">›</span>
          <span className="text-on-surface font-semibold">Nueva Lista de Precios</span>
        </nav>
        <BackButton onClick={() => navigate('/price-list')} className="shrink-0 px-5 py-2.5 text-sm" />
      </div>

      {/* 1. Información General */}
      <SectionCard icon={<ListAltOutlinedIcon sx={{ fontSize: 20 }} />} title="Información General">
        <div className="space-y-4">
          <div>
            <CustomInput
              label="Nombre de la Lista"
              name="nombre"
              required
              value={nombre}
              placeholder="Ej: Lista de Precios Mayo 2026"
              onChange={(e) => setNombre(e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              regex={NAME_REGEX}
              regexErrorText={`Máximo ${NAME_MAX_LENGTH} caracteres`}
              hint={`${nombre.length}/${NAME_MAX_LENGTH} caracteres`}
              helperText={errors.nombre}
            />
            {isDuplicatedName && <FieldWarning>{DUPLICATED_NAME_MESSAGE}</FieldWarning>}
          </div>
          <CustomInput
            label="Descripción"
            name="descripcion"
            multiline
            rows={3}
            value={descripcion}
            placeholder="Descripción opcional de la lista de precios"
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={DESCRIPTION_MAX_LENGTH}
            regex={DESCRIPTION_REGEX}
            regexErrorText={`Máximo ${DESCRIPTION_MAX_LENGTH} caracteres`}
            hint={`${descripcion.length}/${DESCRIPTION_MAX_LENGTH} caracteres`}
            helperText={errors.descripcion}
          />
        </div>
      </SectionCard>

      {/* 2. Productos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-blue-lahuerta"><ListAltOutlinedIcon sx={{ fontSize: 20 }} /></span>
            <h2 className="text-base font-semibold text-on-surface">Productos</h2>
          </div>
          {/* Mismo botón que "Agregar producto" en Editar lista */}
          <SpotlightButton variant="outline" onClick={addItem} className="px-5 py-2.5 text-sm">
            <AddCircleOutlineIcon fontSize="small" />
            Agregar producto
          </SpotlightButton>
        </div>

        <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle">
          {isMobile ? (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="border border-border-subtle rounded-lg p-3 bg-surface-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={mobileLabelCls}>Producto {index + 1}</span>
                    {items.length > 1 && (
                      <IconButton size="small" onClick={() => removeItem(index)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </div>

                  <BasicSelect
                    label="Producto"
                    name={`producto_${index}`}
                    value={item.product ? { name: item.product.descripcion, value: item.product.id } : null}
                    options={getAvailableProducts(index).map((p) => ({ name: p.descripcion, value: p.id }))}
                    onChange={(e) => {
                      const productId = e.target.value?.value;
                      handleProductChange(index, products.find((p) => p.id === productId) || null);
                    }}
                  />

                  <div>
                    <label className={mobileLabelCls}>Precio Bulto</label>
                    <AmountInput
                      name={`precio_bulto_${index}`}
                      value={item.bulkPrice}
                      onChange={(raw) => handleBulkPriceChange(index, raw)}
                      hasError={Boolean(errors[`item_${index}_bulkPrice`])}
                      suffix={getUnitAbbreviation(item.product, bulkSaleType)}
                    />
                  </div>

                  <div>
                    <label className={mobileLabelCls}>Precio Unidad</label>
                    <AmountInput
                      name={`precio_unidad_${index}`}
                      value={item.unitPrice}
                      onChange={(raw) => handleUnitPriceChange(index, raw)}
                      hasError={Boolean(errors[`item_${index}_unitPrice`])}
                      suffix={getUnitAbbreviation(item.product, unitSaleType)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-low text-on-surface">
                    <th className="border border-border-subtle px-2 py-2 text-center w-12">#</th>
                    <th className="border border-border-subtle px-2 py-2 text-center">Producto</th>
                    <th className="border border-border-subtle px-2 py-2 text-center w-48">Precio Bulto</th>
                    <th className="border border-border-subtle px-2 py-2 text-center w-48">Precio Unidad</th>
                    <th className="border border-border-subtle px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-surface-low">
                      <td className="border border-border-subtle px-2 py-1 text-center text-on-surface-muted">
                        {index + 1}
                      </td>
                      <td className="border border-border-subtle px-2 py-1 align-middle" style={{ minWidth: 200 }}>
                        <BasicSelect
                          name={`producto_${index}`}
                          value={item.product ? { name: item.product.descripcion, value: item.product.id } : null}
                          options={getAvailableProducts(index).map((p) => ({ name: p.descripcion, value: p.id }))}
                          onChange={(e) => {
                            const productId = e.target.value?.value;
                            handleProductChange(index, products.find((p) => p.id === productId) || null);
                          }}
                        />
                      </td>
                      <td className="border border-border-subtle px-2 py-1">
                        <AmountInput
                          name={`precio_bulto_${index}`}
                          value={item.bulkPrice}
                          onChange={(raw) => handleBulkPriceChange(index, raw)}
                          hasError={Boolean(errors[`item_${index}_bulkPrice`])}
                          suffix={getUnitAbbreviation(item.product, bulkSaleType)}
                        />
                      </td>
                      <td className="border border-border-subtle px-2 py-1">
                        <AmountInput
                          name={`precio_unidad_${index}`}
                          value={item.unitPrice}
                          onChange={(raw) => handleUnitPriceChange(index, raw)}
                          hasError={Boolean(errors[`item_${index}_unitPrice`])}
                          suffix={getUnitAbbreviation(item.product, unitSaleType)}
                        />
                      </td>
                      <td className="border border-border-subtle px-1 py-1 text-center">
                        {items.length > 1 && (
                          <IconButton size="small" onClick={() => removeItem(index)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-border-subtle">
        <SpotlightButton variant="cancel" onClick={() => navigate('/price-list')} className="w-full sm:w-auto px-6 py-2.5 text-sm">
          Cancelar
        </SpotlightButton>
        <SpotlightButton
          variant="primary"
          onClick={handleSave}
          disabled={saving || !isFormComplete}
          className="w-full sm:w-auto sm:min-w-[10rem] px-6 py-2.5 text-sm"
        >
          {saving ? 'Guardando...' : 'Registrar Lista'}
        </SpotlightButton>
      </div>
    </div>
  );
};

export default PriceListForm;
