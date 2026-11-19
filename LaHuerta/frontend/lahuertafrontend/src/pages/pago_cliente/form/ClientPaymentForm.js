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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import FormActions from '../../../components/FormActions';
import PageHeader from '../../../components/PageHeader';
import RequiredMark from '../../../components/RequiredMark';
import Switch from '../../../components/Switch';
import { TUTORIAL_EVENTS } from '../../../constants/tutorials';
import { emitTutorialEvent } from '../../../utils/tutorial';
import { useToast } from '../../../context/ToastContext';

// ── Estilos reutilizables ─────────────────────────────────────────────────────
const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
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
    chequeNumero: '',
    chequeBanco: '',
    chequeFechaEmision: null,
    chequeDiferido: false,
    chequeFechaDeposito: null,
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [toast, setToast] = useState({ open: false, message: '' });
  const [checkEndosado, setCheckEndosado] = useState(false);
  // Al editar: el cliente y el importe con que se guardó el pago, para calcular cómo queda la cuenta corriente.
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
      const check = data.cheque;
      setCheckEndosado(!!check?.endosado);
      setSavedPayment({ clientId: data.cliente.id, amount: data.importe });
      setInitialValues({
        client: data.cliente.id,
        amount: data.importe,
        paymentDate: data.fecha_pago,
        paymentType: data.tipo_pago.id,
        observations: data.observaciones || '',
        chequeNumero: check?.numero || '',
        chequeBanco: check?.banco || '',
        chequeFechaEmision: check?.fecha_emision || null,
        chequeDiferido: !!check?.fecha_deposito,
        chequeFechaDeposito: check?.fecha_deposito || null,
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
    amount: Yup.number().required('Requerido').positive('El importe debe ser mayor a cero'),
    paymentDate: Yup.date().nullable().required('Requerido'),
    paymentType: Yup.string().required('Requerido'),
  });

  const validate = (values) => {
    const errors = {};
    const selected = selectOptions.paymentTypes.find(
      (opt) => String(opt.value) === String(values.paymentType)
    );
    if (selected?.name === 'Cheque') {
      if (!values.chequeNumero) errors.chequeNumero = 'Requerido';
      if (!values.chequeBanco) errors.chequeBanco = 'Requerido';
      if (!values.chequeFechaEmision) errors.chequeFechaEmision = 'Requerido';
      if (values.chequeDiferido && !values.chequeFechaDeposito) errors.chequeFechaDeposito = 'Requerido';
    }
    return errors;
  };

  const handleSubmit = async (values) => {
    const selected = selectOptions.paymentTypes.find(
      (opt) => String(opt.value) === String(values.paymentType)
    );
    const isCheck = selected?.name === 'Cheque';

    const payload = {
      cliente: values.client,
      importe: values.amount,
      fecha_pago: values.paymentDate,
      tipo_pago: values.paymentType,
      observaciones: values.observations || null,
    };

    if (isCheck) {
      payload.cheque_numero = values.chequeNumero;
      payload.cheque_banco = values.chequeBanco;
      payload.cheque_fecha_emision = values.chequeFechaEmision;
      payload.cheque_fecha_deposito = values.chequeFechaDeposito || null;
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
      const msg = error?.response?.data?.detail || 'Error al guardar el pago.';
      setToast({ open: true, message: msg });
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
      {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => {
        // Registrar se habilita cuando están todos los obligatorios (los del cheque, si es con cheque).
        const formComplete = validationSchema.isValidSync(values) && Object.keys(validate(values)).length === 0;
        const selectedPaymentType = selectOptions.paymentTypes.find(
          (opt) => String(opt.value) === String(values.paymentType)
        );
        const isCheckPayment = selectedPaymentType?.name === 'Cheque';
        const selectedClient = selectOptions.clients.find((client) => String(client.id) === String(values.client)) || null;
        // Saldo del cliente (lo que debe) y cómo queda al guardar. Al editar, el saldo de hoy ya tiene
        // descontado este pago: si el cliente es el mismo, se suma lo que tenía y se resta lo nuevo.
        const currentBalance = selectedClient ? parseFloat(selectedClient.cuenta_corriente || 0) : null;
        const alreadyDiscounted = savedPayment && String(savedPayment.clientId) === String(values.client)
          ? parseFloat(savedPayment.amount || 0) : 0;
        const balanceAfter = selectedClient
          ? currentBalance + alreadyDiscounted - parseFloat(values.amount || 0)
          : null;

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
              {checkEndosado && (
                <div className="md:col-span-3 flex items-start gap-3 px-4 py-3 rounded-lg border bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400">
                  <WarningAmberIcon sx={{ fontSize: 18 }} className="shrink-0 mt-0.5" />
                  <p className="text-sm">
                    Este cheque ya fue endosado a un proveedor. No se puede modificar el cliente, el importe, el tipo de pago ni los datos del cheque (número, banco, fechas).
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
                  disabled={checkEndosado}
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
                helpText="Cómo queda la cuenta corriente del cliente con este pago. Se actualiza al escribir el importe."
              />
              <div className="flex flex-col gap-1" data-tour="payment-amount">
                <label className={labelCls}>Importe<RequiredMark /></label>
                <AmountInput
                  required
                  name="amount"
                  value={values.amount}
                  onChange={(raw) => setFieldValue('amount', raw)}
                  hasError={touched.amount && Boolean(errors.amount)}
                  disabled={checkEndosado}
                />
                <FieldError error={errors.amount} touched={touched.amount} />
              </div>
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
                  disabled={checkEndosado}
                  className={checkEndosado ? lockedSelectCls : inputCls(touched.paymentType && errors.paymentType)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.paymentTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.paymentType} touched={touched.paymentType} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
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

            {/* 2. Datos del cheque (condicional) */}
            {isCheckPayment && (
              <div
                data-tour="payment-check"
                data-tour-complete={Boolean(
                  values.chequeNumero && values.chequeBanco && values.chequeFechaEmision
                  && (!values.chequeDiferido || values.chequeFechaDeposito),
                )}
              >
                <SectionCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} title="Datos del Cheque" cols={3}>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Número<RequiredMark /></label>
                    <input
                      aria-required="true"
                      name="chequeNumero"
                      type="number"
                      min="1"
                      value={values.chequeNumero}
                      onChange={handleChange}
                      placeholder="Nº de cheque"
                      disabled={checkEndosado}
                      className={
                        (checkEndosado ? lockedSelectCls : inputCls(touched.chequeNumero && errors.chequeNumero)) +
                        ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                      }
                    />
                    <FieldError error={errors.chequeNumero} touched={touched.chequeNumero} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Banco<RequiredMark /></label>
                    <select
                      aria-required="true"
                      value={values.chequeBanco}
                      onChange={(e) => setFieldValue('chequeBanco', e.target.value)}
                      disabled={checkEndosado}
                      className={checkEndosado ? lockedSelectCls : inputCls(touched.chequeBanco && errors.chequeBanco)}
                    >
                      <option value="">Seleccionar...</option>
                      {selectOptions.banks.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.name}</option>
                      ))}
                    </select>
                    <FieldError error={errors.chequeBanco} touched={touched.chequeBanco} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Fecha de emisión<RequiredMark /></label>
                    <BasicDatePicker
                      required
                      value={values.chequeFechaEmision}
                      onChange={(date) => setFieldValue('chequeFechaEmision', date)}
                      hasError={touched.chequeFechaEmision && Boolean(errors.chequeFechaEmision)}
                      disabled={checkEndosado}
                    />
                    <FieldError error={errors.chequeFechaEmision} touched={touched.chequeFechaEmision} />
                  </div>
                  {/* Interruptor Sí/No con el mismo formato que "¿Se entrega en otra dirección?" de Clientes.
                      La fecha de depósito aparece al lado, en la misma fila: la sección no cambia de alto
                      (en mobile va debajo, como cualquier campo). */}
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>¿Es un cheque diferido?</label>
                    <div className="flex items-center justify-between h-11 bg-surface-low/50 px-4 rounded-lg">
                      <span className="text-sm font-medium text-on-surface-muted">{values.chequeDiferido ? 'Sí' : 'No'}</span>
                      <Switch
                        checked={values.chequeDiferido}
                        disabled={checkEndosado}
                        ariaLabel="Cheque diferido"
                        onChange={(checked) => {
                          setFieldValue('chequeDiferido', checked);
                          if (!checked) setFieldValue('chequeFechaDeposito', null);
                        }}
                      />
                    </div>
                  </div>
                  {values.chequeDiferido && (
                    <div className="flex flex-col gap-1">
                      <label className={labelCls}>Fecha de depósito<RequiredMark /></label>
                      <BasicDatePicker
                        required
                        value={values.chequeFechaDeposito}
                        onChange={(date) => setFieldValue('chequeFechaDeposito', date)}
                        hasError={touched.chequeFechaDeposito && Boolean(errors.chequeFechaDeposito)}
                        disabled={checkEndosado}
                      />
                      <FieldError error={errors.chequeFechaDeposito} touched={touched.chequeFechaDeposito} />
                    </div>
                  )}
                </SectionCard>
              </div>
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
