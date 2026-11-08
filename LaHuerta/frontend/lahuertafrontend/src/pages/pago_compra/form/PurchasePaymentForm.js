import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { loadOptions } from '../../../utils/selectOptions';
import { purchasePaymentUrl, buyUrl, paymentTypeUrl, checkUrl, ownCheckUrl, supplierUrl } from '../../../constants/urls';
import {
  PURCHASE_PAYMENT_KINDS,
  PURCHASE_PAYMENT_KIND_CONFIG,
  formatBuyNumber,
} from '../../../constants/purchasePaymentTypes';
import { TUTORIAL_EVENTS } from '../../../constants/tutorials';
import { emitTutorialEvent } from '../../../utils/tutorial';
import Toast from '../../../components/Toast';
import BasicDatePicker from '../../../components/DatePicker';
import AmountInput from '../../../components/AmountInput';
import BackButton from '../../../components/BackButton';
import FormActions from '../../../components/FormActions';
import RequiredMark from '../../../components/RequiredMark';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';
import PaymentChecksList, { newCheckEntry } from './PaymentChecksList';

// ── Estilos ───────────────────────────────────────────────────────────────────
const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const readonlyCls =
  'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted select-none cursor-not-allowed';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const SectionCard = ({ icon, title, children, cols = 2 }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
    </div>
    <div className={`bg-surface-card p-4 sm:p-6 rounded-xl shadow-sm border border-border-subtle grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
      {children}
    </div>
  </section>
);

const ReadonlyField = ({ label, value, highlight = false, helpText }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider">{label}</label>
      {helpText && (
        <Tooltip title={helpText} placement="top" arrow>
          <InfoOutlinedIcon sx={{ fontSize: 14, color: '#9ca3af', cursor: 'help', '&:hover': { color: '#4a7bc4' } }} />
        </Tooltip>
      )}
    </div>
    <div className={
      highlight
        ? 'w-full px-3 py-2.5 rounded-lg border text-sm font-semibold select-none cursor-not-allowed bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400'
        : readonlyCls
    }>
      {value || '—'}
    </div>
  </div>
);

const FieldError = ({ error, touched }) =>
  touched && error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null;

// Importe del pago: el mismo campo (y el mismo data-tour) en la sección que corresponda al tipo de pago.
const AmountField = ({ values, errors, touched, setFieldValue }) => (
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
);

const today = () => dayjs().format('YYYY-MM-DD');

const supplierLabel = (supplier) => `${supplier.nombre} — Puesto ${supplier.puesto}`;

// ── Componente principal ──────────────────────────────────────────────────────
// kind: PURCHASE (pago de compras: pide la compra) u ON_ACCOUNT (pago a cuenta: pide el proveedor).
const PurchasePaymentForm = ({ kind = PURCHASE_PAYMENT_KINDS.PURCHASE }) => {
  const navigate = useNavigate();
  const isOnAccount = kind === PURCHASE_PAYMENT_KINDS.ON_ACCOUNT;
  const kindConfig = PURCHASE_PAYMENT_KIND_CONFIG[kind];

  const [toast, setToast] = useState({ open: false, message: '' });
  const [selectOptions, setSelectOptions] = useState({ buys: [], suppliers: [], paymentTypes: [], checks: [], ownChecks: [] });
  const [selectedBuy, setSelectedBuy] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Proveedor del pago: el de la compra elegida o el elegido en el pago a cuenta.
  const paymentSupplierId = isOnAccount ? selectedSupplier?.id : selectedBuy?.proveedor?.id;

  const initialValues = {
    buy: '',
    supplier: '',
    paymentDate: today(),
    amount: '',
    paymentType: '',
    checks: [],
    ownChecks: [],
  };

  useEffect(() => {
    const load = async () => {
      const [buys, suppliers, paymentTypes, checks] = await Promise.all([
        isOnAccount
          ? Promise.resolve([])
          : loadOptions(buyUrl, (data) =>
              data
                .filter((b) => b.payment_status !== 'ABONADO')
                .map((b) => ({
                  name: `${formatBuyNumber(b.id)} — ${b.proveedor?.nombre || b.proveedor} — ${formatDate(b.fecha)}`,
                  value: b.id,
                }))
            ),
        isOnAccount ? loadOptions(supplierUrl, (data) => data) : Promise.resolve([]),
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
      setSelectOptions((prev) => ({ ...prev, buys, suppliers, paymentTypes, checks, ownChecks: [] }));
    };
    load();
  }, [isOnAccount]);

  // Cheques emitidos disponibles para el proveedor del pago: sin usar, o ya usados con este mismo proveedor.
  const loadOwnChecks = async (supplierId) => {
    if (!supplierId) {
      setSelectOptions((prev) => ({ ...prev, ownChecks: [] }));
      return;
    }
    const ownChecks = await loadOptions(
      `${ownCheckUrl}?available=true&supplier_id=${supplierId}`,
      (items) => items.map((c) => ({
        name: `Nro. ${c.numero} — ${c.banco?.descripcion || c.banco} — Saldo: ${formatCurrency(c.remaining_balance)}`,
        value: c.id,
        numero: c.numero,
        banco: c.banco?.descripcion || c.banco,
        importe: c.remaining_balance,
      }))
    );
    setSelectOptions((prev) => ({ ...prev, ownChecks }));
  };

  const resetPaymentFields = (setFieldValue) => {
    setFieldValue('amount', '');
    setFieldValue('paymentType', '');
    setFieldValue('checks', []);
    setFieldValue('ownChecks', []);
  };

  const handleBuyChange = async (buyId, setFieldValue) => {
    setFieldValue('buy', buyId);
    resetPaymentFields(setFieldValue);

    if (!buyId) {
      setSelectedBuy(null);
      loadOwnChecks(null);
      return;
    }
    try {
      const { data } = await axios.get(`${buyUrl}${buyId}/`);
      setSelectedBuy(data);
      loadOwnChecks(data.proveedor?.id);
    } catch {
      setSelectedBuy(null);
      loadOwnChecks(null);
    }
  };

  const handleSupplierChange = (supplierId, setFieldValue) => {
    setFieldValue('supplier', supplierId);
    resetPaymentFields(setFieldValue);
    const supplier = selectOptions.suppliers.find((s) => String(s.id) === String(supplierId)) || null;
    setSelectedSupplier(supplier);
    loadOwnChecks(supplier?.id);
  };

  const validationSchema = Yup.object({
    buy:         isOnAccount ? Yup.string() : Yup.string().required('Requerido'),
    supplier:    isOnAccount ? Yup.string().required('Requerido') : Yup.string(),
    paymentDate: Yup.date().nullable().required('Requerido'),
    paymentType: Yup.string().required('Requerido'),
  });

  const validate = (values) => {
    const errors = {};
    const selected = selectOptions.paymentTypes.find(
      (opt) => String(opt.value) === String(values.paymentType)
    );
    // Con cheques el importe sale de los cheques; con otro tipo se escribe.
    if (selected?.name === 'Cheque') {
      const checkErrors = {};
      values.checks.forEach((entry) => {
        if (!entry.id) checkErrors[entry.key] = { id: 'Elegí un cheque.' };
      });
      if (Object.keys(checkErrors).length) errors.checks = checkErrors;
    } else if (selected?.name === 'Cheque Propio') {
      const ownCheckErrors = {};
      values.ownChecks.forEach((entry) => {
        const option = selectOptions.ownChecks.find((opt) => String(opt.value) === String(entry.id));
        const amount = parseFloat(entry.amount);
        if (!entry.id) {
          ownCheckErrors[entry.key] = { id: 'Elegí un cheque.' };
        } else if (!(amount > 0)) {
          ownCheckErrors[entry.key] = { amount: 'El importe debe ser mayor a cero.' };
        } else if (option && amount > parseFloat(option.importe)) {
          ownCheckErrors[entry.key] = { amount: `Supera el saldo disponible del cheque (${formatCurrency(option.importe)}).` };
        }
      });
      if (Object.keys(ownCheckErrors).length) errors.ownChecks = ownCheckErrors;
    } else if (values.paymentType && !(parseFloat(values.amount) > 0)) {
      errors.amount = values.amount ? 'El importe debe ser mayor a cero' : 'Requerido';
    }
    return errors;
  };

  const handleSubmit = async (values, { setFieldError }) => {
    const selected = selectOptions.paymentTypes.find(
      (opt) => String(opt.value) === String(values.paymentType)
    );
    const payload = {
      proveedor:  paymentSupplierId,
      fecha_pago: values.paymentDate,
      tipo_pago:  values.paymentType,
    };
    if (!isOnAccount) {
      payload.compra = values.buy;
    }
    if (selected?.name === 'Cheque') {
      payload.cheque_ids = values.checks.map((entry) => entry.id);
    } else if (selected?.name === 'Cheque Propio') {
      payload.own_checks = values.ownChecks.map((entry) => ({ id: entry.id, importe: entry.amount }));
    } else {
      payload.importe_abonado = values.amount;
    }
    const formatDetailAmounts = (msg) =>
      msg.replace(/\((\d+(?:\.\d+)?)\)/g, (_, num) => `(${formatCurrency(parseFloat(num))})`);

    try {
      const response = await axios.post(purchasePaymentUrl, payload);
      emitTutorialEvent(TUTORIAL_EVENTS.purchasePaymentCreated, { id: response.data.id });
      navigate('/purchase-payment');
    } catch (error) {
      const detail = error?.response?.data?.detail || '';
      const paysWithChecks = selected?.name === 'Cheque' || selected?.name === 'Cheque Propio';
      if (detail.toLowerCase().includes('saldo pendiente') && !paysWithChecks) {
        setFieldError('amount', 'El importe supera el saldo pendiente de la compra.');
      } else if (detail.toLowerCase().includes('saldo pendiente')) {
        // Con cheques no hay campo de importe: el error va al toast.
        setToast({
          open: true,
          message: formatDetailAmounts(detail).replace('El importe abonado', 'La suma de los cheques'),
        });
      } else {
        const msg = detail
          ? formatDetailAmounts(detail)
          : error?.response?.data?.cheque_ids?.[0] || error?.response?.data?.own_checks?.[0] || 'Error al registrar el pago.';
        setToast({ open: true, message: msg });
      }
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
        const selectedPaymentType = selectOptions.paymentTypes.find(
          (opt) => String(opt.value) === String(values.paymentType)
        );
        const isCheckPayment = selectedPaymentType?.name === 'Cheque';
        const isOwnCheckPayment = selectedPaymentType?.name === 'Cheque Propio';
        const hasPaymentTarget = isOnAccount ? Boolean(selectedSupplier) : Boolean(selectedBuy);
        // "Registrar pago" se habilita con el pago completo: con cheques, al menos uno y todos
        // elegidos (los propios con su importe); con otro tipo, el importe escrito.
        const checksComplete = isCheckPayment
          ? values.checks.length > 0 && values.checks.every((entry) => entry.id)
          : values.ownChecks.length > 0 && values.ownChecks.every((entry) => entry.id && parseFloat(entry.amount) > 0);
        const paymentComplete = hasPaymentTarget && Boolean(values.paymentDate) && Boolean(values.paymentType) && (
          isCheckPayment || isOwnCheckPayment ? checksComplete : parseFloat(values.amount) > 0
        );
        const amountProps = { values, errors, touched, setFieldValue };

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
                <span className="whitespace-nowrap text-on-surface font-semibold">{kindConfig.title}</span>
              </nav>
              <BackButton onClick={() => navigate('/purchase-payment/create')} className="shrink-0 px-5 py-2.5 text-sm" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">{kindConfig.title}</h1>
              <p className="mt-1 text-sm text-on-surface-muted">{kindConfig.subtitle}</p>
            </div>

            {/* 1a. Pago de compras: selección de compra */}
            {!isOnAccount && (
              <SectionCard icon={<ShoppingCartIcon sx={{ fontSize: 20 }} />} title="Compra" cols={1}>
                <div className="flex flex-col gap-1" data-tour="payment-buy" data-tour-complete={Boolean(selectedBuy)}>
                  <label className={labelCls}>Seleccionar compra<RequiredMark /></label>
                  <select
                    value={values.buy}
                    onChange={(e) => handleBuyChange(e.target.value, setFieldValue)}
                    className={inputCls(touched.buy && errors.buy)}
                    aria-required="true"
                  >
                    <option value="">Seleccionar...</option>
                    {selectOptions.buys.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.name}</option>
                    ))}
                  </select>
                  <FieldError error={errors.buy} touched={touched.buy} />
                </div>
              </SectionCard>
            )}

            {/* 2a. Datos de la compra (readonly, visible al seleccionar) */}
            {!isOnAccount && selectedBuy && (
              <SectionCard icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />} title="Datos de la compra" cols={2}>
                <ReadonlyField label="N° Compra"      value={formatBuyNumber(selectedBuy.id)} />
                <ReadonlyField label="Proveedor"      value={selectedBuy.proveedor?.nombre} />
                <ReadonlyField label="Fecha"          value={formatDate(selectedBuy.fecha)} />
                <ReadonlyField
                  label="Importe total"
                  value={formatCurrency(selectedBuy.importe)}
                  helpText="Importe original de la compra, sin tener en cuenta los pagos ya realizados."
                />
                <ReadonlyField
                  label="Saldo pendiente"
                  value={formatCurrency(selectedBuy.outstanding_balance)}
                  highlight
                  helpText="Monto que aún resta abonar. Es el importe total menos los pagos ya registrados para esta compra."
                />
                <ReadonlyField label="Estado"         value={selectedBuy.payment_status} />
              </SectionCard>
            )}

            {/* 1b. Pago a cuenta: selección de proveedor y su saldo */}
            {isOnAccount && (
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
                      <option key={supplier.id} value={supplier.id}>{supplierLabel(supplier)}</option>
                    ))}
                  </select>
                  <FieldError error={errors.supplier} touched={touched.supplier} />
                </div>
                {selectedSupplier && (
                  <ReadonlyField
                    label="Saldo en cuenta corriente"
                    value={formatCurrency(selectedSupplier.cuenta_corriente)}
                    highlight
                    helpText="Lo que La Huerta le debe hoy al proveedor, incluido su saldo inicial. El pago a cuenta se descuenta de este saldo."
                  />
                )}
              </SectionCard>
            )}

            {/* 3. Datos del pago (visible al elegir la compra o el proveedor) */}
            {hasPaymentTarget && (
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
                      const typeName = selectOptions.paymentTypes.find((opt) => String(opt.value) === e.target.value)?.name;
                      setFieldValue('paymentType', e.target.value);
                      setFieldValue('checks', typeName === 'Cheque' ? [newCheckEntry()] : []);
                      setFieldValue('ownChecks', typeName === 'Cheque Propio' ? [newCheckEntry()] : []);
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
                  <AmountField {...amountProps} />
                )}
              </SectionCard>
            )}

            {/* 4. Cheques de clientes: se endosan enteros y el pago es la suma */}
            {hasPaymentTarget && isCheckPayment && (
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

            {/* 5. Cheques emitidos: de cada uno se usa lo indicado */}
            {hasPaymentTarget && isOwnCheckPayment && (
              <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Cheques propios" cols={1}>
                <div
                  data-tour="payment-check"
                  data-tour-complete={values.ownChecks.length > 0 && values.ownChecks.every((entry) => entry.id && parseFloat(entry.amount) > 0)}
                >
                  <p className="mb-3 text-xs text-on-surface-muted">
                    Un cheque emitido se usa con un solo proveedor: lo que no uses ahora queda para otros pagos a este proveedor.
                  </p>
                  <PaymentChecksList
                    entries={values.ownChecks}
                    onChange={(entries) => setFieldValue('ownChecks', entries)}
                    options={selectOptions.ownChecks}
                    errors={submitCount > 0 ? errors.ownChecks : undefined}
                    emptyText="No hay cheques propios disponibles para este proveedor."
                    withAmount
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
