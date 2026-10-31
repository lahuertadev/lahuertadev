import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { emptyMovementUrl, supplierUrl, containerTypeUrl } from '../../../constants/urls';
import { EMPTY_MOVEMENT_TYPES, EMPTY_MOVEMENT_TYPE_CONFIG, EMPTY_MOVEMENT_TYPE_OPTIONS } from '../../../constants/emptyMovementTypes';
import { extractErrorMessage } from '../../../utils/errors';
import { formatCurrency } from '../../../utils/currency';
import { getTodayDate } from '../../../utils/date';
import { loadOptions } from '../../../utils/selectOptions';
import { useToast } from '../../../context/ToastContext';
import Toast from '../../../components/Toast';
import BackButton from '../../../components/BackButton';
import BasicDatePicker from '../../../components/DatePicker';
import BasicSelect from '../../../components/Select';
import CustomInput from '../../../components/Input';
import AmountInput from '../../../components/AmountInput';
import CountUp from '../../../components/CountUp';
import FormActions from '../../../components/FormActions';
import { TUTORIAL_EVENTS } from '../../../constants/tutorials';
import { emitTutorialEvent } from '../../../utils/tutorial';

const EMPTY_LINE = { tipo_contenedor: null, cantidad: '', precio_unitario: '' };

const mobileLabelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1';

const calculateLineSubtotal = (line) => (parseInt(line.cantidad, 10) || 0) * (parseFloat(line.precio_unitario) || 0);

/**
 * Alta y edición de un movimiento de vacíos.
 *
 * Props:
 *   defaultType — tipo precargado al crear (viene de la ruta elegida en la selección: carga o devolución).
 *                 Al editar se usa el tipo guardado del movimiento.
 */
const EmptyMovementForm = ({ defaultType = EMPTY_MOVEMENT_TYPES.LOAD }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { showToast } = useToast();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [suppliers, setSuppliers] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);

  const [supplier, setSupplier] = useState(null);
  const [date, setDate] = useState(getTodayDate);
  const [movementType, setMovementType] = useState(defaultType);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, message: '' });

  // Al editar se vuelve al listado; al crear, a la elección entre carga y devolución.
  const backPath = isEdit ? '/empty-movement' : '/empty-movement/create';
  const typeConfig = EMPTY_MOVEMENT_TYPE_CONFIG[movementType];
  const typeTitle = typeConfig?.title || 'Movimiento de vacíos';

  // ── Opciones ───────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      loadOptions(supplierUrl, (data) => data),
      // Solo los tipos de contenedor que manejan vacíos (ej. cajón, jaula).
      loadOptions(containerTypeUrl, (data) => data.filter((ct) => ct.requiere_vacio)),
    ]).then(([nextSuppliers, nextContainerTypes]) => {
      setSuppliers(nextSuppliers);
      setContainerTypes(nextContainerTypes);
    });
  }, []);

  // ── Cargar datos para edición ──────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;

    axios
      .get(`${emptyMovementUrl}${id}/`)
      .then(({ data: movement }) => {
        setSupplier(movement.proveedor);
        setDate(movement.fecha);
        setMovementType(movement.tipo);
        setReceiptNumber(movement.nro_comprobante || '');
        setLines(movement.contenedores.map((line) => ({
          tipo_contenedor: line.tipo_contenedor.id,
          cantidad: String(line.cantidad),
          precio_unitario: line.precio_unitario,
        })));
      })
      .catch(console.error);
  }, [id, isEdit]);

  // ── Helpers de renglones ───────────────────────────────────────────
  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);

  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const updateLine = (index, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Un tipo de contenedor no puede repetirse dentro del movimiento: se saca del selector de las otras filas.
  const getAvailableContainerTypes = (currentIndex) => {
    const usedIds = lines
      .filter((_, i) => i !== currentIndex)
      .map((line) => line.tipo_contenedor)
      .filter(Boolean);
    return containerTypes.filter((ct) => !usedIds.includes(ct.id));
  };

  const containerTypeValue = (line) =>
    line.tipo_contenedor
      ? { name: containerTypes.find((ct) => ct.id === line.tipo_contenedor)?.descripcion, value: line.tipo_contenedor }
      : null;

  const total = lines.reduce((sum, line) => sum + calculateLineSubtotal(line), 0);

  // ── Validación ─────────────────────────────────────────────────────
  const validate = () => {
    const nextErrors = {};

    if (!supplier) nextErrors.supplier = 'Debe seleccionar un proveedor';
    if (!date) nextErrors.date = 'Debe ingresar una fecha';

    const filledLines = lines.filter((line) => line.tipo_contenedor);
    if (filledLines.length === 0) {
      nextErrors.lines_empty = 'Debe agregar al menos un tipo de vacío';
      return nextErrors;
    }

    lines.forEach((line, index) => {
      if (!line.tipo_contenedor) return;

      const quantity = Number(line.cantidad);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        nextErrors[`line_${index}_cantidad`] = 'Requerido';
      }

      if (line.precio_unitario === '' || parseFloat(line.precio_unitario) < 0) {
        nextErrors[`line_${index}_precio`] = 'Requerido';
      }
    });

    return nextErrors;
  };

  const formErrors = validate();
  const isFormComplete = Object.keys(formErrors).length === 0;
  // Para el tutorial: los renglones están completos (al menos uno, con cantidad y precio válidos).
  const areLinesComplete = !Object.keys(formErrors).some((key) => key.startsWith('line'));

  // ── Guardar ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    const payload = {
      proveedor: supplier.id,
      fecha: date,
      tipo: movementType,
      nro_comprobante: receiptNumber.trim() || null,
      contenedores: lines
        .filter((line) => line.tipo_contenedor)
        .map((line) => ({
          tipo_contenedor: line.tipo_contenedor,
          cantidad: parseInt(line.cantidad, 10),
          precio_unitario: parseFloat(line.precio_unitario) || 0,
        })),
    };

    try {
      if (isEdit) {
        await axios.put(`${emptyMovementUrl}${id}/`, payload);
      } else {
        const response = await axios.post(emptyMovementUrl, payload);
        emitTutorialEvent(TUTORIAL_EVENTS.emptyMovementCreated, { id: response.data.id });
      }

      showToast(isEdit ? 'El movimiento se actualizó correctamente.' : 'El movimiento se cargó correctamente.');
      navigate('/empty-movement');
    } catch (error) {
      setToast({ open: true, message: extractErrorMessage(error, 'Error al guardar el movimiento de vacíos.') });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  const addLineButton = (
    <button
      type="button"
      onClick={addLine}
      className="flex items-center gap-1 bg-transparent border-none text-blue-lahuerta text-sm font-medium cursor-pointer hover:underline hover:underline-offset-2 focus:outline-none"
      style={{ background: 'transparent', boxShadow: 'none' }}
    >
      <AddCircleOutlineIcon fontSize="small" /> Agregar vacío
    </button>
  );

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 bg-surface-card rounded shadow-sm border border-border-subtle w-full max-w-7xl">
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ open: false, message: '' })}
      />

      <BackButton onClick={() => navigate(backPath)} />

      <div className="mt-5 mb-6">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-accent">Vacíos</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
          {isEdit ? `Editar ${typeTitle.toLowerCase()}` : typeTitle}
        </h1>
        <p className="mt-1 text-sm text-on-surface-muted">
          {typeConfig?.subtitle}
        </p>
      </div>

      {/* Sección: Datos del movimiento */}
      <div className="space-y-4 mb-6">
        <h3 className="text-xl font-semibold text-on-surface border-b-2 border-border-subtle pb-2">Datos del movimiento</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div data-tour="empty-supplier" data-tour-complete={Boolean(supplier)}>
            <BasicSelect
              label="Proveedor *"
              name="supplier"
              value={supplier ? { name: supplier.nombre, value: supplier.id } : null}
              options={suppliers.map((s) => ({ name: s.nombre, value: s.id }))}
              onChange={(e) => setSupplier(suppliers.find((s) => s.id === e.target.value?.value) || null)}
              error={errors.supplier}
            />
          </div>

          <div data-tour="empty-date">
            <BasicDatePicker
              label="Fecha *"
              name="fecha"
              value={date}
              onChange={(nextDate) => setDate(nextDate)}
              hasError={Boolean(errors.date)}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          <div data-tour="empty-type">
            <BasicSelect
              label="Tipo *"
              name="tipo"
              value={EMPTY_MOVEMENT_TYPE_OPTIONS.find((option) => option.value === movementType) || null}
              options={EMPTY_MOVEMENT_TYPE_OPTIONS}
              onChange={(e) => setMovementType(e.target.value?.value || defaultType)}
            />
          </div>

          <div data-tour="empty-receipt">
            <CustomInput
              label="N° de comprobante"
              name="nro_comprobante"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              maxLength={30}
              hint="Opcional: número del vale o factura del proveedor."
            />
          </div>
        </div>
      </div>

      {/* Sección: Vacíos */}
      <div className="space-y-4 mb-6" data-tour="empty-lines" data-tour-complete={areLinesComplete}>
        <h3 className="text-xl font-semibold text-on-surface border-b-2 border-border-subtle pb-2">Vacíos</h3>

        <div className="flex items-center justify-end">{addLineButton}</div>

        {isMobile ? (
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="border border-border-subtle rounded-lg p-3 bg-surface-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className={mobileLabelCls}>Vacío {index + 1}</span>
                  {lines.length > 1 && (
                    <IconButton size="small" onClick={() => removeLine(index)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </div>

                <BasicSelect
                  label="Tipo de vacío"
                  name={`tipo_contenedor_${index}`}
                  value={containerTypeValue(line)}
                  options={getAvailableContainerTypes(index).map((ct) => ({ name: ct.descripcion, value: ct.id }))}
                  onChange={(e) => updateLine(index, 'tipo_contenedor', e.target.value?.value ?? null)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={mobileLabelCls}>Cantidad</label>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      inputProps={{ min: 1, step: 1 }}
                      value={line.cantidad}
                      onChange={(e) => updateLine(index, 'cantidad', e.target.value)}
                      error={Boolean(errors[`line_${index}_cantidad`])}
                    />
                  </div>
                  <div>
                    <label className={mobileLabelCls}>Precio unitario</label>
                    <AmountInput
                      name={`precio_unitario_${index}`}
                      value={line.precio_unitario}
                      onChange={(raw) => updateLine(index, 'precio_unitario', raw)}
                      hasError={Boolean(errors[`line_${index}_precio`])}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
                  <span className={mobileLabelCls + ' mb-0'}>Subtotal</span>
                  <span className="font-semibold text-on-surface">
                    {line.tipo_contenedor ? formatCurrency(calculateLineSubtotal(line)) : '—'}
                  </span>
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
                  <th className="border border-border-subtle px-2 py-2 text-center">Tipo de vacío</th>
                  <th className="border border-border-subtle px-2 py-2 text-center w-28">Cantidad</th>
                  <th className="border border-border-subtle px-2 py-2 text-center w-36">Precio unitario</th>
                  <th className="border border-border-subtle px-2 py-2 text-center w-32">Subtotal</th>
                  <th className="border border-border-subtle px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="hover:bg-surface-low">
                    <td className="border border-border-subtle px-2 py-1 text-center text-on-surface-muted">{index + 1}</td>

                    <td className="border border-border-subtle px-2 py-1 align-middle" style={{ minWidth: 200 }}>
                      <BasicSelect
                        name={`tipo_contenedor_${index}`}
                        value={containerTypeValue(line)}
                        options={getAvailableContainerTypes(index).map((ct) => ({ name: ct.descripcion, value: ct.id }))}
                        onChange={(e) => updateLine(index, 'tipo_contenedor', e.target.value?.value ?? null)}
                      />
                    </td>

                    <td className="border border-border-subtle px-2 py-1">
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, step: 1 }}
                        value={line.cantidad}
                        onChange={(e) => updateLine(index, 'cantidad', e.target.value)}
                        error={Boolean(errors[`line_${index}_cantidad`])}
                        sx={{ '& input': { textAlign: 'right' } }}
                      />
                    </td>

                    <td className="border border-border-subtle px-2 py-1">
                      <AmountInput
                        name={`precio_unitario_${index}`}
                        value={line.precio_unitario}
                        onChange={(raw) => updateLine(index, 'precio_unitario', raw)}
                        hasError={Boolean(errors[`line_${index}_precio`])}
                      />
                    </td>

                    <td className="border border-border-subtle px-2 py-1 text-right font-medium text-on-surface">
                      {line.tipo_contenedor ? formatCurrency(calculateLineSubtotal(line)) : '—'}
                    </td>

                    <td className="border border-border-subtle px-1 py-1 text-center">
                      {lines.length > 1 && (
                        <IconButton size="small" onClick={() => removeLine(index)} color="error">
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

        {errors.lines_empty && <p className="text-red-500 text-sm">{errors.lines_empty}</p>}

        {/* Total */}
        <div className="flex justify-end mt-3 pr-10">
          <div className="text-right">
            <span className="text-on-surface-muted text-sm mr-4">TOTAL</span>
            <CountUp value={total} className="text-xl font-bold text-on-surface" />
          </div>
        </div>
      </div>

      <FormActions
        onCancel={() => navigate('/empty-movement')}
        onConfirm={handleSave}
        confirmLabel={saving ? 'Guardando…' : 'Confirmar'}
        confirmDisabled={saving || !isFormComplete}
      />
    </div>
  );
};

export default EmptyMovementForm;
