import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { loadOptions } from '../../../utils/selectOptions';
import { purchasePaymentUrl, buyUrl, paymentTypeUrl, checkUrl, ownCheckUrl, supplierUrl } from '../../../constants/urls';
import { TUTORIAL_EVENTS } from '../../../constants/tutorials';
import { emitTutorialEvent } from '../../../utils/tutorial';
import Toast from '../../../components/Toast';
import ReadonlyField from '../../../components/ReadonlyField';
import { useToast } from '../../../context/ToastContext';
import BasicDatePicker from '../../../components/DatePicker';
import AmountInput from '../../../components/AmountInput';
import BackButton from '../../../components/BackButton';
import FormActions from '../../../components/FormActions';
import RequiredMark from '../../../components/RequiredMark';
import { formatCurrency } from '../../../utils/currency';
import { formatSupplierLabel } from '../../../utils/supplier';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';
import PaymentChecksList, { entryAmount, newCheckEntry } from './PaymentChecksList';
import PurchaseAllocationList, { ALLOCATION_HELP_TEXT } from '../shared/PurchaseAllocationList';
import { allocationErrors, applicationsPayload, sortOldestFirst } from '../shared/allocation';

// ── Estilos ───────────────────────────────────────────────────────────────────
const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const SectionCard = ({ icon, title, children, cols = 2, helpText }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      {helpText && (
        <Tooltip title={helpText} placement="top" arrow>
          <InfoOutlinedIcon aria-label={helpText} sx={{ fontSize: 16, color: '#9ca3af', cursor: 'help', '&:hover': { color: '#4a7bc4' } }} />
        </Tooltip>
      )}
    </div>
    <div className={`bg-surface-card p-4 sm:p-6 rounded-xl shadow-sm border border-border-subtle grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
      {children}
    </div>
  </section>
);

const FieldError = ({ error, touched }) =>
  touched && error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null;

const today = () => dayjs().format('YYYY-MM-DD');

const formatDetailAmounts = (msg) =>
  msg.replace(/\((\d+(?:\.\d+)?)\)/g, (_, num) => `(${formatCurrency(parseFloat(num))})`);

// Importe del pago: con cheques es la suma de los cheques; con otro tipo, el escrito.
export const paymentAmountOf = (values, paymentTypeName, options) => {
  if (paymentTypeName === 'Cheque') {
    return String(values.checks.reduce((sum, entry) => sum + entryAmount(entry, options.checks), 0));
  }
  if (paymentTypeName === 'Cheque Propio') {
    return String(values.ownChecks.reduce((sum, entry) => sum + entryAmount(entry, options.ownChecks), 0));
  }
  return values.amount || '';
};

// ── Componente principal ──────────────────────────────────────────────────────
// Un solo formulario para pagarle a un proveedor (DEV-150): se elige el proveedor, se cargan los
// datos del pago y se tildan las compras que cubre. Lo que no se aplica a ninguna compra queda a
// cuenta; sin compras tildadas, el pago es todo a cuenta.
const PurchasePaymentForm = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [toast, setToast] = useState({ open: false, message: '' });
  const [selectOptions, setSelectOptions] = useState({ suppliers: [], paymentTypes: [], checks: [], ownChecks: [] });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierBuys, setSupplierBuys] = useState([]);

  const initialValues = {
    supplier: '',
    paymentDate: today(),
    amount: '',
    paymentType: '',
    checks: [],
    ownChecks: [],
    selectedBuys: [],
    allocations: {},
  };

  useEffect(() => {
    const load = async () => {
      const [suppliers, paymentTypes, checks] = await Promise.all([
        loadOptions(supplierUrl, (data) => data),
        loadOptions(paymentTypeUrl, (data) =>
          data
            .map((t) => ({ name: t.descripcion, value: t.id }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        ),
        loadOptions(`${checkUrl}?estado=EN_CARTERA`, (data) =>
          data.map((c) => ({
            name: `Nro. ${c.numero} — ${c.banco?.descripcion || c.banco} — ${formatCurrency(c.importe)}`,
            value: c.id,
            numero: c.numero,
            banco: c.banco?.descripcion || c.banco,
            importe: c.importe,
          }))
        ),
      ]);
      setSelectOptions((prev) => ({ ...prev, suppliers, paymentTypes, checks, ownChecks: [] }));
    };
    load();
  }, []);

  // Compras del proveedor con saldo pendiente, de la más vieja a la más nueva.
  const loadSupplierBuys = async (supplierId) => {
    if (!supplierId) {
      setSupplierBuys([]);
      return;
    }
    const buys = await loadOptions(`${buyUrl}?proveedor_id=${supplierId}`, (data) =>
      data
        .filter((buy) => buy.payment_status !== 'ABONADO')
        .map((buy) => ({ id: buy.id, fecha: buy.fecha, importe: buy.importe, available: buy.outstanding_balance }))
    );
    setSupplierBuys(sortOldestFirst(buys));
  };

  // Cheques emitidos disponibles: emitidos y sin un pago vigente. Como los de clientes, se usan enteros.
  const loadOwnChecks = async (supplierId) => {
    if (!supplierId) {
      setSelectOptions((prev) => ({ ...prev, ownChecks: [] }));
      return;
    }
    const ownChecks = await loadOptions(
      `${ownCheckUrl}?available=true`,
      (items) => items.map((c) => ({
        name: `Nro. ${c.numero} — ${c.banco?.descripcion || c.banco} — ${formatCurrency(c.importe)}`,
        value: c.id,
        numero: c.numero,
        banco: c.banco?.descripcion || c.banco,
        importe: c.importe,
      }))
    );
    setSelectOptions((prev) => ({ ...prev, ownChecks }));
  };

  const handleSupplierChange = (supplierId, setFieldValue) => {
    setFieldValue('supplier', supplierId);
    setFieldValue('amount', '');
    setFieldValue('paymentType', '');
    setFieldValue('checks', []);
    setFieldValue('ownChecks', []);
    setFieldValue('selectedBuys', []);
    setFieldValue('allocations', {});
    const supplier = selectOptions.suppliers.find((s) => String(s.id) === String(supplierId)) || null;
    setSelectedSupplier(supplier);
    loadOwnChecks(supplier?.id);
    loadSupplierBuys(supplier?.id);
  };

  const paymentTypeName = (values) =>
    selectOptions.paymentTypes.find((opt) => String(opt.value) === String(values.paymentType))?.name;

  const validationSchema = Yup.object({
    supplier:    Yup.string().required('Requerido'),
    paymentDate: Yup.date().nullable().required('Requerido'),
    paymentType: Yup.string().required('Requerido'),
  });

  const validate = (values) => {
    const errors = {};
    const typeName = paymentTypeName(values);
    // Con cheques el importe sale de los cheques; con otro tipo se escribe.
    if (typeName === 'Cheque' || typeName === 'Cheque Propio') {
      const field = typeName === 'Cheque' ? 'checks' : 'ownChecks';
      const checkErrors = {};
      values[field].forEach((entry) => {
        if (!entry.id) checkErrors[entry.key] = { id: 'Elegí un cheque.' };
      });
      if (Object.keys(checkErrors).length) errors[field] = checkErrors;
    } else if (values.paymentType && !(parseFloat(values.amount) > 0)) {
      errors.amount = values.amount ? 'El importe debe ser mayor a cero' : 'Requerido';
    }
    const allocation = allocationErrors(supplierBuys, values.allocations, paymentAmountOf(values, typeName, selectOptions));
    if (Object.keys(allocation.rows).length || allocation.total) errors.allocations = allocation.total || 'Revisá lo aplicado a las compras.';
    return errors;
  };

  const handleSubmit = async (values) => {
    const typeName = paymentTypeName(values);
    const payload = {
      proveedor:  selectedSupplier?.id,
      fecha_pago: values.paymentDate,
      tipo_pago:  values.paymentType,
      compras:    applicationsPayload(values.allocations),
    };
    if (typeName === 'Cheque') {
      payload.cheque_ids = values.checks.map((entry) => entry.id);
    } else if (typeName === 'Cheque Propio') {
      payload.own_check_ids = values.ownChecks.map((entry) => entry.id);
    } else {
      payload.importe_abonado = values.amount;
    }

    try {
      const response = await axios.post(purchasePaymentUrl, payload);
      emitTutorialEvent(TUTORIAL_EVENTS.purchasePaymentCreated, { id: response.data.id });
      showToast('El pago se registró correctamente.');
      navigate('/purchase-payment');
    } catch (error) {
      const data = error?.response?.data || {};
      const detail = data.detail
        || data.compras?.[0]
        || data.cheque_ids?.[0]
        || data.own_check_ids?.[0]
        || 'Error al registrar el pago.';
      setToast({ open: true, message: formatDetailAmounts(String(detail)) });
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      validate={validate}
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, setFieldValue, submitCount }) => {
        const typeName = paymentTypeName(values);
        const isCheckPayment = typeName === 'Cheque';
        const isOwnCheckPayment = typeName === 'Cheque Propio';
        const paymentAmount = paymentAmountOf(values, typeName, selectOptions);
        // "Registrar pago" se habilita con el pago completo: con cheques, al menos uno y todos
        // elegidos (los propios con su importe); con otro tipo, el importe escrito.
        const checksComplete = isCheckPayment
          ? values.checks.length > 0 && values.checks.every((entry) => entry.id)
          : values.ownChecks.length > 0 && values.ownChecks.every((entry) => entry.id);
        const paymentComplete = Boolean(selectedSupplier) && Boolean(values.paymentDate) && Boolean(values.paymentType) && (
          isCheckPayment || isOwnCheckPayment ? checksComplete : parseFloat(values.amount) > 0
        );

        return (
          <Form className="w-full max-w-5xl mx-auto space-y-8 pb-12">
            <Toast
              open={toast.open}
              message={toast.message}
              onClose={() => setToast({ open: false, message: '' })}
              responsive
            />

            {/* Breadcrumbs + Volver */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
              <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
                <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
                <span className="text-xs">›</span>
                <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/purchase-payment')}>Pagos de Compras</span>
                <span className="text-xs">›</span>
                <span className="whitespace-nowrap text-on-surface font-semibold">Nuevo pago</span>
              </nav>
              <BackButton onClick={() => navigate('/purchase-payment')} className="shrink-0 px-5 py-2.5 text-sm" />
            </div>

            {/* 1. Proveedor y su saldo */}
            <SectionCard icon={<LocalShippingIcon sx={{ fontSize: 20 }} />} title="Proveedor" cols={2}>
              <div className="flex flex-col gap-1" data-tour="payment-supplier" data-tour-complete={Boolean(selectedSupplier)}>
                <label className={labelCls}>Proveedor<RequiredMark /></label>
                <select
                  value={values.supplier}
                  onChange={(e) => handleSupplierChange(e.target.value, setFieldValue)}
                  className={inputCls(touched.supplier && errors.supplier)}
                  aria-required="true"
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{formatSupplierLabel(supplier)}</option>
                  ))}
                </select>
                <FieldError error={errors.supplier} touched={touched.supplier} />
              </div>
              {selectedSupplier && (
                <ReadonlyField
                  label="Saldo en cuenta corriente"
                  value={formatCurrency(selectedSupplier.cuenta_corriente)}
                  highlight
                  helpText="Lo que La Huerta le debe hoy al proveedor, incluido su saldo inicial. El pago se descuenta de este saldo."
                />
              )}
            </SectionCard>

            {/* 2. Datos del pago (visible al elegir el proveedor) */}
            {selectedSupplier && (
              <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Datos del pago" cols={2}>
                <div className="flex flex-col gap-1" data-tour="payment-date">
                  <label className={labelCls}>Fecha de pago<RequiredMark /></label>
                  <BasicDatePicker
                    value={values.paymentDate}
                    onChange={(date) => setFieldValue('paymentDate', date)}
                    hasError={touched.paymentDate && Boolean(errors.paymentDate)}
                    error={touched.paymentDate && errors.paymentDate}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1" data-tour="payment-type">
                  <label className={labelCls}>Tipo de pago<RequiredMark /></label>
                  <select
                    value={values.paymentType}
                    onChange={(e) => {
                      const name = selectOptions.paymentTypes.find((opt) => String(opt.value) === e.target.value)?.name;
                      setFieldValue('paymentType', e.target.value);
                      setFieldValue('checks', name === 'Cheque' ? [newCheckEntry()] : []);
                      setFieldValue('ownChecks', name === 'Cheque Propio' ? [newCheckEntry()] : []);
                      setFieldValue('amount', '');
                    }}
                    className={inputCls(touched.paymentType && errors.paymentType)}
                    aria-required="true"
                  >
                    <option value="">Seleccionar...</option>
                    {selectOptions.paymentTypes.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.name}</option>
                    ))}
                  </select>
                  <FieldError error={errors.paymentType} touched={touched.paymentType} />
                </div>

                {values.paymentType && !isCheckPayment && !isOwnCheckPayment && (
                  <div className="flex flex-col gap-1" data-tour="payment-amount">
                    <label className={labelCls}>Importe abonado<RequiredMark /></label>
                    <AmountInput
                      name="amount"
                      value={values.amount}
                      onChange={(raw) => setFieldValue('amount', raw)}
                      hasError={touched.amount && Boolean(errors.amount)}
                    />
                    <FieldError error={errors.amount} touched={touched.amount} />
                  </div>
                )}
              </SectionCard>
            )}

            {/* 3. Cheques de clientes: se endosan enteros y el pago es la suma */}
            {selectedSupplier && isCheckPayment && (
              <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Cheques" cols={1}>
                <div data-tour="payment-check" data-tour-complete={values.checks.length > 0 && values.checks.every((entry) => entry.id)}>
                  <p className="mb-3 text-xs text-on-surface-muted">
                    Elegí los cheques en cartera que le endosás al proveedor. Cada cheque se usa entero.
                  </p>
                  <PaymentChecksList
                    entries={values.checks}
                    onChange={(entries) => setFieldValue('checks', entries)}
                    options={selectOptions.checks}
                    errors={submitCount > 0 ? errors.checks : undefined}
                    emptyText="No hay cheques en cartera disponibles."
                  />
                </div>
              </SectionCard>
            )}

            {/* 4. Cheques emitidos: como los de clientes, se usan enteros y el pago es la suma */}
            {selectedSupplier && isOwnCheckPayment && (
              <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Cheques propios" cols={1}>
                <div
                  data-tour="payment-check"
                  data-tour-complete={values.ownChecks.length > 0 && values.ownChecks.every((entry) => entry.id)}
                >
                  <p className="mb-3 text-xs text-on-surface-muted">
                    Elegí los cheques emitidos que le entregás al proveedor. Cada cheque se usa entero.
                  </p>
                  <PaymentChecksList
                    entries={values.ownChecks}
                    onChange={(entries) => setFieldValue('ownChecks', entries)}
                    options={selectOptions.ownChecks}
                    errors={submitCount > 0 ? errors.ownChecks : undefined}
                    emptyText="No hay cheques propios disponibles."
                  />
                </div>
              </SectionCard>
            )}

            {/* 5. Compras que cubre el pago, con el reparto del importe */}
            {selectedSupplier && (
              <SectionCard icon={<ShoppingCartIcon sx={{ fontSize: 20 }} />} title="Compras pendientes de pago" cols={1} helpText={ALLOCATION_HELP_TEXT}>
                <div data-tour="payment-buys">
                  <PurchaseAllocationList
                    buys={supplierBuys}
                    paymentAmount={paymentAmount}
                    showErrors={submitCount > 0}
                  />
                </div>
              </SectionCard>
            )}

            <FormActions
              onCancel={() => navigate('/purchase-payment')}
              confirmLabel={<><PaymentsOutlinedIcon sx={{ fontSize: 18 }} /> Registrar pago</>}
              confirmType="submit"
              confirmDisabled={!paymentComplete}
            />
          </Form>
        );
      }}
    </Formik>
  );
};

export default PurchasePaymentForm;
