import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { buyUrl } from '../../../constants/urls';
import { extractErrorMessage } from '../../../utils/errors';
import { getTodayDate } from '../../../utils/date';
import { useToast } from '../../../context/ToastContext';
import Toast from '../../../components/Toast';
import BasicDatePicker from '../../../components/DatePicker';
import AlertDialog from '../../../components/DialogAlert';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BuyBlock from '../shared/BuyBlock';
import BuyPageHeader from '../shared/BuyPageHeader';
import BuyFormActions from '../shared/BuyFormActions';
import useBuyOptions from '../shared/useBuyOptions';
import useExistingBuySuppliers from '../shared/useExistingBuySuppliers';
import { createEmptyBlock, validateBlock, getVaciosWarnings, getExistingBuyWarning, buildBuyPayload } from '../shared/buyBlockUtils';

const CompraForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { showToast } = useToast();

  const options = useBuyOptions();

  const [fecha, setFecha] = useState(getTodayDate);
  const [block, setBlock] = useState(createEmptyBlock);
  const existingSupplierIds = useExistingBuySuppliers(fecha, id);
  const hasExistingBuy = Boolean(block.supplier) && existingSupplierIds.includes(block.supplier.id);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, message: '' });
  const [warnings, setWarnings] = useState([]);
  const [showWarningsDialog, setShowWarningsDialog] = useState(false);

  // Al editar se vuelve al listado; al crear, a la elección del tipo de carga.
  const backPath = isEdit ? '/buy' : '/buy/create';

  // ── Cargar datos para edición ──────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;

    axios
      .get(`${buyUrl}${id}/`)
      .then((response) => {
        const buy = response.data;

        setFecha(buy.fecha);

        setBlock({
          supplier: { label: buy.proveedor.nombre, ...buy.proveedor },
          hasSign: parseFloat(buy.senia) > 0,
          sign: parseFloat(buy.senia) > 0 ? buy.senia : '',
          items: buy.items.map((item) => ({
            producto: { label: item.producto.descripcion, ...item.producto },
            cantidad_producto: item.cantidad_producto,
            tipo_venta: item.tipo_venta?.id ?? null,
            precio: item.precio_bulto,
          })),
          vacios: (buy.vacios || []).map((v) => ({
            tipo_contenedor: v.tipo_contenedor.id,
            cantidad: v.cantidad,
            precio_unitario: v.precio_unitario,
          })),
        });
      })
      .catch(console.error);
  }, [id, isEdit]);

  // ── Limpiar advertencias al modificar items o vacíos ──────────────
  useEffect(() => { setWarnings([]); setShowWarningsDialog(false); }, [block.items, block.vacios]);

  // ── Validación ─────────────────────────────────────────────────────
  const validate = () => {
    const nextErrors = validateBlock(block);
    if (!fecha) nextErrors.fecha = 'Debe ingresar una fecha';
    return nextErrors;
  };

  // ── Guardar ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setWarnings([]);
      return;
    }

    setErrors({});

    // Advertencias no bloqueantes: compra ya cargada al proveedor en la fecha y vacíos faltantes.
    const nextWarnings = [
      ...(hasExistingBuy ? [getExistingBuyWarning(fecha)] : []),
      ...getVaciosWarnings(block, options.saleTypes, options.containerTypes),
    ];
    if (nextWarnings.length > 0) {
      setWarnings(nextWarnings);
      setShowWarningsDialog(true);
      return;
    }

    await executeSave();
  };

  const executeSave = async () => {
    setShowWarningsDialog(false);
    setWarnings([]);
    setSaving(true);

    try {
      const payload = { ...buildBuyPayload(block), fecha };

      if (isEdit) {
        await axios.put(`${buyUrl}${id}/`, payload);
      } else {
        await axios.post(buyUrl, payload);
      }

      showToast(isEdit ? 'La compra se actualizó correctamente.' : 'La compra se cargó correctamente.');
      navigate('/buy');
    } catch (error) {
      setToast({ open: true, message: extractErrorMessage(error, 'Error al guardar la compra.') });
    } finally {
      setSaving(false);
    }
  };

  // El botón Confirmar queda habilitado recién cuando el formulario está completo:
  // proveedor + fecha cargados y al menos un producto con cantidad y precio válidos.
  // Los vacíos son opcionales, así que no forman parte de esta validación.
  const isFormComplete = Object.keys(validate()).length === 0;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 bg-surface-card rounded shadow-sm border border-border-subtle w-full max-w-5xl">
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ open: false, message: '' })}
      />

      <BuyPageHeader
        title={isEdit ? `Editar compra #${String(id).padStart(8, '0')}` : 'Carga simple'}
        subtitle={isEdit ? 'Modificá los datos, productos o vacíos de la compra.' : 'Una compra a un proveedor para una fecha específica.'}
        onBack={() => navigate(backPath)}
      />

      <BuyBlock
        block={block}
        onChange={setBlock}
        options={options}
        errors={errors}
        existingBuyDate={hasExistingBuy ? fecha : null}
        dateField={
          <>
            <BasicDatePicker
              label="Fecha *"
              name="fecha"
              value={fecha}
              onChange={(date) => setFecha(date)}
              hasError={Boolean(errors.fecha)}
            />
            {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>}
          </>
        }
      />

      <AlertDialog
        open={showWarningsDialog}
        title="Revisá antes de guardar"
        message={
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((msg, i) => <li key={i}>{msg}</li>)}
            <li className="mt-2 list-none text-xs">¿Querés guardar la compra de todas formas?</li>
          </ul>
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
        onConfirm={handleSave}
        confirmLabel={saving ? 'Guardando…' : 'Confirmar'}
        confirmDisabled={saving || !isFormComplete}
      />
    </div>
  );
};

export default CompraForm;
