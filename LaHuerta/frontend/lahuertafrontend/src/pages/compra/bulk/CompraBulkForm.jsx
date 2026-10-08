import React, { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { buyBulkUrl } from '../../../constants/urls';
import { formatCurrency } from '../../../utils/currency';
import { extractErrorMessage } from '../../../utils/errors';
import { getTodayDate } from '../../../utils/date';
import { useToast } from '../../../context/ToastContext';
import Toast from '../../../components/Toast';
import CountUp from '../../../components/CountUp';
import BasicDatePicker from '../../../components/DatePicker';
import AlertDialog from '../../../components/DialogAlert';
import BuyBlock from '../shared/BuyBlock';
import BuyPageHeader from '../shared/BuyPageHeader';
import BuyFormActions from '../shared/BuyFormActions';
import useBuyOptions from '../shared/useBuyOptions';
import useExistingBuySuppliers from '../shared/useExistingBuySuppliers';
import {
  createEmptyBlock,
  validateBlock,
  getVaciosWarnings,
  buildBuyPayload,
  calculateBlockTotals,
  formatTelefono,
  getExistingBuyWarning,
} from '../shared/buyBlockUtils';

// Nombres legibles para los campos que puede devolver el backend en los errores de cada compra.
const FIELD_LABELS = {
  proveedor: 'Proveedor',
  senia: 'Seña',
  items: 'Productos',
  vacios: 'Vacíos',
  producto: 'Producto',
  tipo_venta: 'Tipo de venta',
  cantidad_producto: 'Cantidad',
  precio_bulto: 'Precio',
  precio_unitario: 'Precio unitario',
  tipo_contenedor: 'Tipo de contenedor',
  cantidad: 'Cantidad',
  detail: null,
  non_field_errors: null,
};

// Aplana los errores anidados de DRF ({ items: [{}, { precio_bulto: ['...'] }] }) en mensajes de texto.
const flattenErrors = (value, path = []) => {
  if (typeof value === 'string') {
    const prefix = path.filter(Boolean).join(' › ');
    return [prefix ? `${prefix}: ${value}` : value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? flattenErrors(entry, [...path, `#${index + 1}`])
        : flattenErrors(entry, path)
    );
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([field, fieldErrors]) =>
      flattenErrors(fieldErrors, [...path, field in FIELD_LABELS ? FIELD_LABELS[field] : field])
    );
  }
  return [];
};

const CompraBulkForm = () => {
  const navigate = useNavigate();
  const options = useBuyOptions();
  const { showToast } = useToast();
  const nextKey = useRef(1);

  const createEntry = () => ({ key: nextKey.current++, block: createEmptyBlock(), savedBuy: null, serverErrors: [] });

  const [buyDate, setBuyDate] = useState(getTodayDate);
  const [entries, setEntries] = useState(() => [createEntry()]);
  const existingSupplierIds = useExistingBuySuppliers(buyDate);
  const [collapsedKeys, setCollapsedKeys] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, message: '' });
  const [warnings, setWarnings] = useState([]);
  const [showWarningsDialog, setShowWarningsDialog] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const pendingEntries = entries.filter((entry) => !entry.savedBuy);
  const savedCount = entries.length - pendingEntries.length;


  // ── Helpers de bloques ────────────────────────────────────────────
  const updateEntryBlock = useCallback((key, updater) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.key === key ? { ...entry, block: updater(entry.block), serverErrors: [] } : entry))
    );
  }, []);

  const addEntry = () => setEntries((prev) => [...prev, createEntry()]);

  const removeEntry = (key) => setEntries((prev) => prev.filter((entry) => entry.key !== key));

  const toggleCollapsed = (key) =>
    setCollapsedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  // Un bloque con errores se expande solo, para que el error no quede oculto.
  const expandEntries = (keys) => setCollapsedKeys((prev) => prev.filter((key) => !keys.includes(key)));

  const getExcludedSupplierIds = (key) =>
    entries
      .filter((entry) => entry.key !== key)
      .map((entry) => entry.block.supplier?.id)
      .filter(Boolean);

  const loadTotal = entries.reduce((sum, entry) => sum + calculateBlockTotals(entry.block).total, 0);

  // ── Validación ─────────────────────────────────────────────────────
  const validate = () => {
    const nextErrors = {};
    if (!buyDate) nextErrors.date = 'Debe ingresar una fecha';

    pendingEntries.forEach((entry) => {
      const blockErrors = validateBlock(entry.block);
      if (Object.keys(blockErrors).length > 0) nextErrors[entry.key] = blockErrors;
    });

    return nextErrors;
  };

  // ── Guardar ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      expandEntries(Object.keys(validationErrors).map(Number));
      return;
    }

    setErrors({});

    // Advertencias por proveedor: compra ya cargada en la fecha y vacíos faltantes.
    const nextWarnings = pendingEntries
      .map((entry) => {
        const messages = [];
        if (existingSupplierIds.includes(entry.block.supplier.id)) {
          messages.push(getExistingBuyWarning(buyDate));
        }
        messages.push(...getVaciosWarnings(entry.block, options.saleTypes, options.containerTypes));
        return { supplierName: entry.block.supplier.nombre, messages };
      })
      .filter((warning) => warning.messages.length > 0);

    if (nextWarnings.length > 0) {
      setWarnings(nextWarnings);
      setShowWarningsDialog(true);
      return;
    }

    await executeSave();
  };

  const applyResult = (result, sentEntries) => {
    const createdByIndex = Object.fromEntries(result.creadas.map(({ index, compra }) => [index, compra]));
    const errorsByIndex = Object.fromEntries(result.errores.map(({ index, errores }) => [index, flattenErrors(errores)]));
    const sentKeys = sentEntries.map((entry) => entry.key);

    setEntries((prev) =>
      prev.map((entry) => {
        const index = sentKeys.indexOf(entry.key);
        if (index === -1) return entry;
        if (createdByIndex[index]) return { ...entry, savedBuy: createdByIndex[index], serverErrors: [] };
        return { ...entry, serverErrors: errorsByIndex[index] || [] };
      })
    );

    expandEntries(result.errores.map(({ index }) => sentKeys[index]));

    if (result.errores.length === 0) {
      // Cuenta todas las compras de la carga, incluidas las guardadas en intentos anteriores.
      const totalSaved = entries.length;
      showToast(
        totalSaved === 1
          ? 'La compra se cargó correctamente.'
          : `Las ${totalSaved} compras se cargaron correctamente.`
      );
      navigate('/buy');
      return;
    }

    const savedNow = result.creadas.length;
    setResultMessage(
      savedNow > 0
        ? `Se guardaron ${savedNow} de ${sentEntries.length} compras. Corregí las que fallaron y volvé a confirmar: solo se envían las que faltan.`
        : 'No se guardó ninguna compra. Revisá los errores de cada proveedor y volvé a confirmar.'
    );
  };

  const executeSave = async () => {
    setShowWarningsDialog(false);
    setWarnings([]);
    setResultMessage('');
    setSaving(true);

    const sentEntries = pendingEntries;

    try {
      const payload = {
        fecha: buyDate,
        compras: sentEntries.map((entry) => buildBuyPayload(entry.block)),
      };

      const response = await axios.post(buyBulkUrl, payload);
      applyResult(response.data, sentEntries);
    } catch (error) {
      const data = error?.response?.data;

      // 400 con resultado por compra: ninguna se guardó, pero cada una trae su error.
      if (data?.creadas && data?.errores) {
        applyResult(data, sentEntries);
        return;
      }

      setToast({ open: true, message: extractErrorMessage(error, 'Error al guardar las compras.') });
    } finally {
      setSaving(false);
    }
  };

  // Igual que en la carga simple: Confirmar se habilita cuando todas las compras pendientes están completas.
  const isFormComplete = pendingEntries.length > 0 && Object.keys(validate()).length === 0;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 bg-surface-card rounded shadow-sm border border-border-subtle w-full max-w-5xl">
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ open: false, message: '' })}
        responsive
      />

      <BuyPageHeader
        title="Carga masiva"
        subtitle="Varias compras a distintos proveedores para una misma fecha: cargá la fecha una vez y agregá un bloque por proveedor."
        onBack={() => navigate('/buy/create')}
      />

      {/* Fecha única de la carga */}
      <div className="mb-6 max-w-xs">
        <BasicDatePicker
          label="Fecha *"
          name="fecha"
          value={buyDate}
          onChange={(date) => setBuyDate(date)}
          hasError={Boolean(errors.date)}
          disabled={savedCount > 0}
        />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        <p className="text-xs text-on-surface-muted mt-1">
          {savedCount > 0
            ? 'La fecha queda fija porque ya hay compras guardadas en esta carga.'
            : 'Todas las compras de esta carga se registran con esta fecha.'}
        </p>
      </div>

      {resultMessage && (
        <div className="flex items-start gap-2 mb-6 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-sm text-on-surface">
          <WarningAmberIcon sx={{ fontSize: 20, color: '#d97706' }} />
          <span>{resultMessage}</span>
        </div>
      )}

      {/* Un bloque por proveedor */}
      <div className="space-y-4">
        {entries.map((entry, position) =>
          entry.savedBuy ? (
            <div
              key={entry.key}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl border border-green-500/40 bg-green-500/10"
            >
              <div className="flex items-center gap-2 text-on-surface">
                <CheckCircleOutlineIcon sx={{ fontSize: 20, color: '#22c55e' }} />
                <span className="font-semibold">{entry.savedBuy.proveedor.nombre}</span>
                <span className="text-sm text-on-surface-muted">
                  Compra #{String(entry.savedBuy.id).padStart(8, '0')} guardada
                </span>
              </div>
              <span className="font-bold text-on-surface pl-7 sm:pl-0">{formatCurrency(entry.savedBuy.importe)}</span>
            </div>
          ) : (
            <div
              key={entry.key}
              className={`rounded-xl border bg-surface-card overflow-hidden ${entry.serverErrors.length > 0 ? 'border-red-500/50' : 'border-border-subtle'}`}
            >
              {/* Encabezado de la card: número, proveedor, total y compactar/expandir */}
              <div
                className={`flex items-center gap-3 px-3 sm:px-4 py-3 bg-surface-low/60 ${collapsedKeys.includes(entry.key) ? '' : 'border-b border-border-subtle'}`}
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                  {position + 1}
                </span>

                <div className="min-w-0 flex-1">
                  {entry.block.supplier ? (
                    <>
                      <p className="truncate font-semibold text-on-surface">{entry.block.supplier.nombre}</p>
                      <p className="truncate text-xs text-on-surface-muted">
                        {[
                          entry.block.supplier.mercado?.descripcion,
                          entry.block.supplier.puesto && `Puesto ${entry.block.supplier.puesto}`,
                          formatTelefono(entry.block.supplier.telefono),
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-muted">Elegí un proveedor</p>
                  )}
                </div>

                <CountUp
                  value={calculateBlockTotals(entry.block).total}
                  className="flex-shrink-0 font-bold text-on-surface"
                />

                <IconButton
                  size="small"
                  onClick={() => toggleCollapsed(entry.key)}
                  aria-label={collapsedKeys.includes(entry.key) ? 'Expandir proveedor' : 'Compactar proveedor'}
                  aria-expanded={!collapsedKeys.includes(entry.key)}
                  sx={{ color: 'var(--color-on-surface-muted)' }}
                >
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{
                      transition: 'transform 200ms',
                      transform: collapsedKeys.includes(entry.key) ? 'rotate(0deg)' : 'rotate(180deg)',
                    }}
                  />
                </IconButton>

                {pendingEntries.length > 1 && (
                  <IconButton size="small" onClick={() => removeEntry(entry.key)} color="error" aria-label="Quitar proveedor">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </div>

              <Collapse in={!collapsedKeys.includes(entry.key)} timeout={200}>
              <div className="p-3 sm:p-4">
                {entry.serverErrors.length > 0 && (
                  <div className="flex items-start gap-2 mb-4 p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-on-surface">
                    <ErrorOutlineIcon sx={{ fontSize: 20, color: '#ef4444' }} />
                    <ul className="space-y-1">
                      {entry.serverErrors.map((message, index) => <li key={index}>{message}</li>)}
                    </ul>
                  </div>
                )}

                <BuyBlock
                  block={entry.block}
                  onChange={(updater) => updateEntryBlock(entry.key, updater)}
                  options={options}
                  errors={errors[entry.key]}
                  excludedSupplierIds={getExcludedSupplierIds(entry.key)}
                  existingBuyDate={
                    entry.block.supplier && existingSupplierIds.includes(entry.block.supplier.id) ? buyDate : null
                  }
                  compact
                />
              </div>
              </Collapse>
            </div>
          )
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
          style={{ background: 'transparent', boxShadow: 'none' }}
        >
          <AddCircleOutlineIcon fontSize="small" /> Agregar proveedor
        </button>

        <div className="text-right">
          <span className="text-on-surface-muted text-sm mr-4">TOTAL DE LA CARGA</span>
          <CountUp value={loadTotal} className="text-xl font-bold text-on-surface" />
        </div>
      </div>

      <AlertDialog
        open={showWarningsDialog}
        title="Revisá antes de guardar"
        message={
          <div className="space-y-3">
            {warnings.map((warning) => (
              <div key={warning.supplierName}>
                <p className="font-semibold">{warning.supplierName}</p>
                <ul className="list-disc list-inside space-y-1">
                  {warning.messages.map((message, index) => <li key={index}>{message}</li>)}
                </ul>
              </div>
            ))}
            <p className="text-xs">¿Querés guardar las compras de todas formas?</p>
          </div>
        }
        icon={<WarningAmberIcon sx={{ fontSize: 20, color: '#d97706' }} />}
        confirmClassName="bg-amber-500 hover:bg-amber-600"
        confirmLabel="Guardar igual"
        cancelLabel="Volver a revisar"
        onConfirm={executeSave}
        onCancel={() => setShowWarningsDialog(false)}
      />

      <BuyFormActions
        onCancel={() => navigate('/buy')}
        cancelLabel={savedCount > 0 ? 'Salir' : 'Cancelar'}
        onConfirm={handleSave}
        confirmLabel={saving ? 'Guardando…' : `Confirmar ${pendingEntries.length} compra${pendingEntries.length !== 1 ? 's' : ''}`}
        confirmDisabled={saving || !isFormComplete}
      />
    </div>
  );
};

export default CompraBulkForm;
