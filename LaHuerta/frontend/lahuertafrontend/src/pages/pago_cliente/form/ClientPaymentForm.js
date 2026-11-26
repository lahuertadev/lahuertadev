import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadOptions } from '../../../utils/selectOptions';
import { clientPaymentUrl, clientUrl, paymentTypeUrl, bankUrl } from '../../../constants/urls';
import Toast from '../../../components/Toast';
import ClientAutocomplete from '../../../components/ClientAutocomplete';
import ReadonlyField from '../../../components/ReadonlyField';
import { formatCurrency } from '../../../utils/currency';
import BasicDatePicker from '../../../components/DatePicker';
import AmountInput from '../../../components/AmountInput';
import PersonIcon from '@mui/icons-material/PersonOutline';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import FormActions from '../../../components/FormActions';
import PageHeader from '../../../components/PageHeader';
import RequiredMark from '../../../components/RequiredMark';
import { TUTORIAL_EVENTS } from '../../../constants/tutorials';
import { CHECK_PAYMENT_TYPE } from '../../../constants/clientPayment';
import { emitTutorialEvent } from '../../../utils/tutorial';
import { extractErrorMessage } from '../../../utils/errors';
import { useToast } from '../../../context/ToastContext';
import ClientPaymentChecks, { checksTotal, clientCheckFromApi, newClientCheck } from './ClientPaymentChecks';

// ── Estilos reutilizables ─────────────────────────────────────────────────────
const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-1 ring-red-400'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const SectionCard = ({ icon, title, children, cols = 3 }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
    </div>
    <div className={`bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
      {children}
    </div>
  </section>
);

const FieldError = ({ error, touched }) =>
  touched && error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null;

const REQUIRED = 'Requerido';

// En los cheques solo se muestran los errores de lo cargado (importe en cero, cheque repetido): los
// obligatorios ya los marca el asterisco y Registrar queda deshabilitado hasta completarlos.
const visibleCheckErrors = (checkErrors = {}) => Object.fromEntries(
  Object.entries(checkErrors).map(([key, fields]) => [
    key,
    Object.fromEntries(Object.entries(fields).filter(([, message]) => message !== REQUIRED)),
  ]),
);

const lockedSelectCls = 'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted cursor-not-allowed';

// ── Componente principal ──────────────────────────────────────────────────────
const ClientPaymentForm = () => {
  const [selectOptions, setSelectOptions] = useState({ clients: [], paymentTypes: [], banks: [] });
  const [initialValues, setInitialValues] = useState({
    client: '',
    amount: '',
    paymentDate: null,
    paymentType: '',
    observations: '',
    checks: [newClientCheck()],
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [toast, setToast] = useState({ open: false, message: '' });
  // Al editar: el cliente y el importe con que se guardó el pago, para calcular cómo queda la cuenta
  // corriente, y si tenía cheques (entonces el cliente y el tipo de pago no se cambian).
  const [savedPayment, setSavedPayment] = useState(null);

  const loadInitialOptions = async () => {
    const [clients, paymentTypes, banks] = await Promise.all([
      // Los clientes completos: el buscador filtra por razón social, nombre de fantasía o CUIT, y de ahí sale el saldo.
      loadOptions(clientUrl, (data) => data),
      // En orden alfabético, como en Pagos de Compras.
      loadOptions(paymentTypeUrl, (data) =>
        data
          .map((t) => ({ name: t.descripcion, value: t.id }))
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      ),
      loadOptions(bankUrl, (data) =>
        data.map((b) => ({ name: b.descripcion, value: b.id }))
      ),
    ]);
    setSelectOptions({ clients, paymentTypes, banks });
  };

  const fetchItemToEdit = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`${clientPaymentUrl}${id}/`);
      const data = response.data;
      const checks = data.cheques || [];
      setSavedPayment({ clientId: data.cliente.id, amount: data.importe, hasChecks: checks.length > 0 });
      setInitialValues({
        client: data.cliente.id,
        amount: data.importe,
        paymentDate: data.fecha_pago,
        paymentType: data.tipo_pago.id,
        observations: data.observaciones || '',
        checks: checks.length ? checks.map(clientCheckFromApi) : [newClientCheck()],
      });
    } catch (error) {
      console.error('Error al cargar el pago:', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      await loadInitialOptions();
      await fetchItemToEdit();
    };
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const validationSchema = Yup.object({
    client: Yup.string().required('Requerido'),
    paymentDate: Yup.date().nullable().required('Requerido'),
    paymentType: Yup.string().required('Requerido'),
  });

  const isCheckType = (paymentTypeId) => selectOptions.paymentTypes.find(
    (opt) => String(opt.value) === String(paymentTypeId)
  )?.name === CHECK_PAYMENT_TYPE;

  // Errores de cada cheque, por su key: campos obligatorios, importe y el mismo cheque dos veces.
  const validateChecks = (checks) => {
    const errors = {};
    const seen = new Set();
    checks.forEach((check) => {
      const checkErrors = {};
      if (!check.numero) checkErrors.numero = REQUIRED;
      if (!check.banco) checkErrors.banco = REQUIRED;
      if (!check.importe) checkErrors.importe = REQUIRED;
      else if (!(parseFloat(check.importe) > 0)) checkErrors.importe = 'El importe debe ser mayor a cero';
      if (!check.fechaEmision) checkErrors.fechaEmision = REQUIRED;
      if (check.diferido && !check.fechaDeposito) checkErrors.fechaDeposito = REQUIRED;
      const id = `${check.numero}-${check.banco}`;
      if (check.numero && check.banco && seen.has(id)) checkErrors.numero = 'Este cheque ya está en el pago';
      seen.add(id);
      if (Object.keys(checkErrors).length) errors[check.key] = checkErrors;
    });
    return errors;
  };

  const validate = (values) => {
    const errors = {};
    if (isCheckType(values.paymentType)) {
      const checkErrors = validateChecks(values.checks);
      if (Object.keys(checkErrors).length) errors.checks = checkErrors;
    } else if (!(parseFloat(values.amount) > 0)) {
      errors.amount = values.amount ? 'El importe debe ser mayor a cero' : 'Requerido';
    }
    return errors;
  };

  const handleSubmit = async (values) => {
    const isCheck = isCheckType(values.paymentType);

    const payload = {
      cliente: values.client,
      fecha_pago: values.paymentDate,
      tipo_pago: values.paymentType,
      observaciones: values.observations || null,
    };

    // Con cheques, el importe del pago es la suma: lo calcula el backend. Los cheques que ya tenía el
    // pago van con su id; los nuevos, sin id; los que no van se quitan.
    if (isCheck) {
      payload.cheques = values.checks.map((check) => ({
        ...(check.id ? { id: check.id } : {}),
        numero: check.numero,
        banco: check.banco,
        importe: check.importe,
        fecha_emision: check.fechaEmision,
        fecha_deposito: check.diferido ? check.fechaDeposito : null,
      }));
    } else {
      payload.importe = values.amount;
    }

    try {
      if (id) {
        await axios.put(`${clientPaymentUrl}${id}/`, payload);
      } else {
        const response = await axios.post(clientPaymentUrl, payload);
        emitTutorialEvent(TUTORIAL_EVENTS.clientPaymentCreated, { id: response.data.id });
      }
      showToast(id ? 'El pago se actualizó correctamente.' : 'El pago se registró correctamente.');
      navigate('/client-payment');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
      setToast({ open: true, message: extractErrorMessage(error, 'Error al guardar el pago.') });
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      validate={validate}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, handleChange, setFieldValue, isSubmitting, submitCount }) => {
        // Registrar se habilita cuando están todos los obligatorios (los de los cheques, si es con cheques).
        const formComplete = validationSchema.isValidSync(values) && Object.keys(validate(values)).length === 0;
        const isCheckPayment = isCheckType(values.paymentType);
        // Un pago con cheques no cambia de cliente ni de tipo de pago: se anula y se carga de nuevo.
        const lockedClientAndType = Boolean(savedPayment?.hasChecks);
        const amount = isCheckPayment ? checksTotal(values.checks) : parseFloat(values.amount || 0);
        const checkErrors = visibleCheckErrors(errors.checks);
        const selectedClient = selectOptions.clients.find((client) => String(client.id) === String(values.client)) || null;
        // Saldo del cliente (lo que debe) y cómo queda al guardar. Al editar, el saldo de hoy ya tiene
        // descontado este pago: si el cliente es el mismo, se suma lo que tenía y se resta lo nuevo.
        const currentBalance = selectedClient ? parseFloat(selectedClient.cuenta_corriente || 0) : null;
        const alreadyDiscounted = savedPayment && String(savedPayment.clientId) === String(values.client)
          ? parseFloat(savedPayment.amount || 0) : 0;
        const balanceAfter = selectedClient ? currentBalance + alreadyDiscounted - amount : null;

        return (
          <Form className="w-full max-w-7xl mx-auto space-y-8 pb-12">
            <Toast
              open={toast.open}
              message={toast.message}
              onClose={() => setToast({ open: false, message: '' })}
            />

            <PageHeader
              breadcrumbs={[
                { label: 'Inicio', path: '/' },
                { label: 'Pagos de Clientes', path: '/client-payment' },
                { label: id ? 'Editar' : 'Nuevo' },
              ]}
              onBack={() => navigate('/client-payment')}
            />

            {/* 1. Datos del pago */}
            <SectionCard icon={<PersonIcon sx={{ fontSize: 20 }} />} title="Datos del Pago" cols={3}>
              {lockedClientAndType && (
                <div className="md:col-span-3 flex items-start gap-3 px-4 py-3 rounded-lg border bg-blue-lahuerta/5 border-blue-lahuerta/20 text-on-surface">
                  <InfoOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 mt-0.5 text-blue-lahuerta" />
                  <p className="text-sm">
                    Es un pago con cheques: para cambiar el cliente o el tipo de pago, anulá el pago y cargalo de nuevo.
                    Podés corregir los datos de los cheques, cambiar el importe de los que están en cartera, agregar cheques y quitar los que están en cartera.
                  </p>
                </div>
              )}
              {/* Buscador como el de Facturación. El tutorial da el paso por hecho recién con un cliente elegido. */}
              <div className="flex flex-col gap-1" data-tour="payment-client" data-tour-complete={Boolean(selectedClient)}>
                <label className={labelCls}>Cliente<RequiredMark /></label>
                <ClientAutocomplete
                  required
                  clients={selectOptions.clients}
                  value={selectedClient}
                  onChange={(client) => setFieldValue('client', client ? client.id : '')}
                  hasError={touched.client && Boolean(errors.client)}
                  disabled={lockedClientAndType}
                />
                <FieldError error={errors.client} touched={touched.client} />
              </div>
              <ReadonlyField
                label="Saldo en cuenta corriente"
                value={selectedClient ? formatCurrency(currentBalance) : null}
                helpText="Lo que el cliente debe hoy, incluido su saldo inicial."
              />
              <ReadonlyField
                label={id ? 'Saldo al guardar los cambios' : 'Saldo después del pago'}
                value={selectedClient ? formatCurrency(balanceAfter) : null}
                highlight={Boolean(selectedClient)}
                helpText="Cómo queda la cuenta corriente del cliente con este pago. Se actualiza al cargar el importe o los cheques."
              />
              <div className="flex flex-col gap-1" data-tour="payment-date">
                <label className={labelCls}>Fecha de pago<RequiredMark /></label>
                <BasicDatePicker
                  required
                  value={values.paymentDate}
                  onChange={(date) => setFieldValue('paymentDate', date)}
                  hasError={touched.paymentDate && Boolean(errors.paymentDate)}
                />
                <FieldError error={errors.paymentDate} touched={touched.paymentDate} />
              </div>
              <div className="flex flex-col gap-1" data-tour="payment-type">
                <label className={labelCls}>Tipo de pago<RequiredMark /></label>
                <select
                  aria-required="true"
                  value={values.paymentType}
                  onChange={(e) => setFieldValue('paymentType', e.target.value)}
                  disabled={lockedClientAndType}
                  className={lockedClientAndType ? lockedSelectCls : inputCls(touched.paymentType && errors.paymentType)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.paymentTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.paymentType} touched={touched.paymentType} />
              </div>
              {/* Con cheques, el importe es la suma de los cheques: no se escribe. */}
              {isCheckPayment ? (
                <ReadonlyField
                  label="Importe"
                  value={formatCurrency(amount)}
                  helpText="Es la suma de los cheques del pago."
                />
              ) : (
                <div className="flex flex-col gap-1" data-tour="payment-amount">
                  <label className={labelCls}>Importe<RequiredMark /></label>
                  <AmountInput
                    required
                    name="amount"
                    value={values.amount}
                    onChange={(raw) => setFieldValue('amount', raw)}
                    hasError={(touched.amount || submitCount > 0) && Boolean(errors.amount)}
                  />
                  <FieldError error={errors.amount} touched={touched.amount || submitCount > 0} />
                </div>
              )}
              <div className="flex flex-col gap-1 md:col-span-3">
                <label className={labelCls}>Observaciones</label>
                <input
                  name="observations"
                  type="text"
                  value={values.observations}
                  onChange={handleChange}
                  placeholder="Opcional..."
                  className={inputCls(false)}
                />
              </div>
            </SectionCard>

            {/* 2. Cheques (condicional): uno o más; el importe del pago es la suma */}
            {isCheckPayment && (
              <section
                className="space-y-3"
                data-tour="payment-check"
                data-tour-complete={Object.keys(validateChecks(values.checks)).length === 0}
              >
                <div className="flex items-center gap-2 px-1">
                  <span className="text-blue-lahuerta"><AccountBalanceIcon sx={{ fontSize: 20 }} /></span>
                  <h2 className="text-base font-semibold text-on-surface">Cheques</h2>
                </div>
                <p className="px-1 text-xs text-on-surface-muted">
                  Cargá los cheques con que pagó el cliente; con "Agregar cheque" sumás otro.
                </p>
                <ClientPaymentChecks
                  entries={values.checks}
                  onChange={(checks) => setFieldValue('checks', checks)}
                  banks={selectOptions.banks}
                  errors={checkErrors}
                />
              </section>
            )}

            <FormActions
              onCancel={() => navigate('/client-payment')}
              onBack={() => navigate('/client-payment')}
              confirmType="submit"
              confirmLabel={<><SaveOutlinedIcon sx={{ fontSize: 18 }} /> {id ? 'Guardar cambios' : 'Registrar Pago'}</>}
              confirmDisabled={isSubmitting || !formComplete}
            />

          </Form>
        );
      }}
    </Formik>
  );
};

export default ClientPaymentForm;
