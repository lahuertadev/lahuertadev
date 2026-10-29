import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadOptions } from '../../../utils/selectOptions';
import { extractErrorMessage } from '../../../utils/errors';
import { clientUrl, ConditionIvaTypeUrl, provincesUrl, priceListUrl } from '../../../constants/urls';
import Toast from '../../../components/Toast';
import { useToast } from '../../../context/ToastContext';
import BasicDatePicker from '../../../components/DatePicker';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOnOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import AmountInput from '../../../components/AmountInput';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FormActions from '../../../components/FormActions';
import BackButton from '../../../components/BackButton';
import Switch from '../../../components/Switch';
import { TUTORIAL_EVENTS } from '../../../constants/tutorials';
import { emitTutorialEvent } from '../../../utils/tutorial';

// ── Utilidades ───────────────────────────────────────────────────────────────

const formatTelefono = (raw = '') => {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

const formatCuit = (raw = '') => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
};

const BACKEND_TO_FORM_FIELD = {
  cuit: 'cuit',
  razon_social: 'businessName',
  cuenta_corriente: 'checkingAccount',
  telefono: 'phone',
  domicilio: 'address',
  nombre_fantasia: 'fantasyName',
};

const extractFieldErrors = (error) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return {};
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail' || key === 'error') continue;
    const formField = BACKEND_TO_FORM_FIELD[key];
    if (formField && Array.isArray(value) && value.length) {
      result[formField] = value[0];
    }
  }
  return result;
};

// ── Estilos reutilizables ─────────────────────────────────────────────────────
const inputCls = (hasError, isLocked = false) =>
  isLocked
    ? 'w-full bg-field-locked px-3 py-2.5 rounded-lg border border-field-locked-border text-sm text-on-surface-muted cursor-not-allowed'
    : `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
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

const HelpTooltip = ({ text }) => (
  <Tooltip title={text} placement="top" arrow>
    <HelpOutlineIcon sx={{ fontSize: 15, color: '#9ca3af', cursor: 'help', '&:hover': { color: '#4a7bc4' } }} />
  </Tooltip>
);

const PRICE_LIST_HELP = (
  <ul className="list-disc pl-4 space-y-1">
    <li><strong>Sí:</strong> el precio se toma de la lista asignada.</li>
    <li><strong>No:</strong> el precio se ingresa a mano al facturar.</li>
  </ul>
);

const STATE_HELP = (
  <ul className="list-disc pl-4 space-y-1">
    <li><strong>Activo:</strong> el cliente sigue operando.</li>
    <li><strong>Inactivo:</strong> conserva su historial, pero no aparece al asignar listas de precios.</li>
  </ul>
);

// ── Componente principal ──────────────────────────────────────────────────────
const ClientForm = () => {
  const [selectOptions, setSelectOptions] = useState({
    ivaCondition: [],
    provinces: [],
    cities: [],
    districts: [],
    priceLists: [],
  });

  const [initialValues, setInitialValues] = useState({
    cuit: '',
    businessName: '',
    fantasyName: '',
    province: null,
    city: null,
    district: null,
    address: '',
    ivaCondition: null,
    usesPriceList: true,
    priceList: null,
    phone: '',
    salesStartDate: null,
    state: true,
    checkingAccount: '',
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, message: '' });
  const { showToast } = useToast();

  const loadInitialOptions = async () => {
    const ivaCondition = await loadOptions(ConditionIvaTypeUrl, (data) =>
      data.map((item) => ({ name: item.descripcion, value: item.id }))
    );
    const provinces = await loadOptions(provincesUrl, (data) =>
      [...data.provincias]
        .map((item) => ({ name: item.nombre, value: item.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    const priceLists = await loadOptions(priceListUrl, (data) =>
      data.map((item) => ({ name: item.nombre, value: item.id }))
    );
    setSelectOptions({ ivaCondition, provinces, cities: [], districts: [], priceLists });
  };

  const loadCitiesByProvinceId = async (province) => {
    if (!province?.value || province.value === -1) {
      setSelectOptions((prev) => ({ ...prev, cities: [], districts: [] }));
      return;
    }
    const citiesUrl = `https://apis.datos.gob.ar/georef/api/municipios?provincia=${province.value}&campos=id,nombre&max=150`;
    const cities = await loadOptions(citiesUrl, (data) =>
      [...data.municipios]
        .map((item) => ({ name: item.nombre, value: item.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setSelectOptions((prev) => ({ ...prev, cities, districts: [] }));
  };

  const loadDistrictsByCityId = async (city) => {
    if (!city?.value || city.value === -1) {
      setSelectOptions((prev) => ({ ...prev, districts: [] }));
      return;
    }
    const districtsUrl = `https://apis.datos.gob.ar/georef/api/localidades?municipio=${city.value}&campos=id,nombre&max=50`;
    const districts = await loadOptions(districtsUrl, (data) =>
      [...data.localidades]
        .map((item) => ({ name: item.nombre, value: item.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setSelectOptions((prev) => ({ ...prev, districts }));
  };

  const fetchItemToEdit = async () => {
    try {
      const response = await axios.get(`${clientUrl}${id}/`);
      const data = response.data;
      const province = { name: data.localidad.municipio.provincia.nombre, value: data.localidad.municipio.provincia.id };
      const city = { name: data.localidad.municipio.nombre, value: data.localidad.municipio.id };
      const district = { name: data.localidad.nombre, value: data.localidad.id };
      await loadCitiesByProvinceId(province);
      await loadDistrictsByCityId(city);
      setInitialValues({
        cuit: data.cuit,
        businessName: data.razon_social,
        fantasyName: data.nombre_fantasia,
        province,
        city,
        district,
        address: data.domicilio,
        ivaCondition: { name: data.condicion_IVA.descripcion, value: data.condicion_IVA.id },
        usesPriceList: data.lista_precios != null,
        priceList: data.lista_precios ? { name: data.lista_precios.nombre, value: data.lista_precios.id } : null,
        phone: data.telefono,
        salesStartDate: data.fecha_inicio_ventas,
        state: data.estado,
        checkingAccount: data.cuenta_corriente,
      });
    } catch (error) {
      console.error('Error al cargar el cliente para edición:', error);
    }
  };

  const validationSchema = Yup.object({
    cuit: Yup.string().required('CUIT es obligatorio'),
    businessName: Yup.string().required('Razón Social es obligatoria'),
    province: Yup.object().nullable().required('La provincia es obligatoria'),
    city: Yup.object().nullable().required('El municipio es obligatorio'),
    district: Yup.object().nullable().required('La localidad es obligatoria'),
    ivaCondition: Yup.object().nullable().required('La Condición de IVA es obligatoria'),
    priceList: Yup.object().nullable().when('usesPriceList', {
      is: true,
      then: (schema) => schema.required('La lista de precios es obligatoria'),
    }),
    salesStartDate: Yup.string().nullable().required('Fecha de inicio de ventas es obligatoria'),
  });

  const mapFormDataToBackend = (values) => ({
    cuit: values.cuit,
    razon_social: values.businessName,
    localidad: {
      id: values.district?.value,
      nombre: values.district?.name,
      municipio: {
        id: values.city?.value,
        nombre: values.city?.name,
        provincia: { id: values.province?.value, nombre: values.province?.name },
      },
    },
    domicilio: values.address,
    condicion_IVA: values.ivaCondition?.value,
    lista_precios: values.usesPriceList ? values.priceList?.value : null,
    telefono: values.phone,
    fecha_inicio_ventas: values.salesStartDate,
    nombre_fantasia: values.fantasyName,
    estado: values.state,
    cuenta_corriente: values.checkingAccount !== '' ? values.checkingAccount : '0',
  });

  const handleSubmit = async (values, { setFieldError, setFieldTouched }) => {
    try {
      const mappedValues = mapFormDataToBackend(values);
      if (id) {
        await axios.put(`${clientUrl}${id}/`, mappedValues);
      } else {
        const response = await axios.post(clientUrl, mappedValues);
        emitTutorialEvent(TUTORIAL_EVENTS.clientCreated, { id: response.data.id });
      }
      showToast(id ? 'El cliente se actualizó correctamente.' : 'El cliente se creó correctamente.');
      navigate('/client');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
      const fieldErrors = extractFieldErrors(error);
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setFieldError(field, message);
        setFieldTouched(field, true, false);
      });
      setToast({ open: true, message: extractErrorMessage(error) });
    }
  };

  useEffect(() => {
    const load = async () => {
      await loadInitialOptions();
      if (id) await fetchItemToEdit();
    };
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, handleChange, setFieldValue, setFieldTouched, setValues, setTouched, isSubmitting }) => (
        <Form className="w-full max-w-7xl mx-auto space-y-8 pb-12">
          <Toast
            open={toast.open}
            message={toast.message}
            onClose={() => setToast({ open: false, message: '' })}
          />

          {/* Breadcrumbs + Volver arriba a la derecha, separados del contenido con la misma línea que el pie */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-subtle">
            <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
              <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
              <span className="text-xs">›</span>
              <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/client')}>Clientes</span>
              <span className="text-xs">›</span>
              <span className="text-on-surface font-semibold">{id ? 'Editar Cliente' : 'Nuevo Cliente'}</span>
            </nav>
            <BackButton onClick={() => navigate('/client')} className="shrink-0 px-5 py-2.5 text-sm" />
          </div>

          {/* 1. Datos de la Empresa */}
          <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Datos de la Empresa">
            <div className="flex flex-col gap-1" data-tour="client-cuit">
              <label className={labelCls}>CUIT</label>
              <input
                name="cuit"
                value={formatCuit(values.cuit)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setFieldValue('cuit', raw);
                }}
                placeholder="20-XXXXXXXX-X"
                className={inputCls(touched.cuit && errors.cuit)}
              />
              <FieldError error={errors.cuit} touched={touched.cuit} />
            </div>
            <div className="flex flex-col gap-1" data-tour="client-business-name">
              <label className={labelCls}>Razón Social</label>
              <input
                name="businessName"
                value={values.businessName}
                onChange={handleChange}
                placeholder="Nombre legal de la empresa"
                className={inputCls(touched.businessName && errors.businessName)}
              />
              <FieldError error={errors.businessName} touched={touched.businessName} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Nombre Fantasía</label>
              <input
                name="fantasyName"
                value={values.fantasyName}
                onChange={handleChange}
                placeholder="Nombre comercial"
                className={inputCls(false)}
              />
            </div>
          </SectionCard>

          {/* 2. Datos de Dirección */}
          <SectionCard icon={<LocationOnIcon sx={{ fontSize: 20 }} />} title="Datos de Dirección">
            <div className="flex flex-col gap-1" data-tour="client-province">
              <label className={labelCls}>Provincia</label>
              <select
                value={values.province?.value || ''}
                onChange={async (e) => {
                  const selected = selectOptions.provinces.find(o => String(o.value) === e.target.value) || null;
                  setValues(prev => ({ ...prev, province: selected, city: null, district: null }));
                  setTouched(prev => ({ ...prev, city: false, district: false }), false);
                  await loadCitiesByProvinceId(selected);
                }}
                className={inputCls(touched.province && errors.province)}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.provinces.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
              <FieldError error={errors.province} touched={touched.province} />
            </div>
            <div className="flex flex-col gap-1" data-tour="client-city">
              <label className={labelCls}>Municipio</label>
              <select
                value={values.city?.value || ''}
                onChange={async (e) => {
                  const selected = selectOptions.cities.find(o => String(o.value) === e.target.value) || null;
                  setValues(prev => ({ ...prev, city: selected, district: null }));
                  setTouched(prev => ({ ...prev, district: false }), false);
                  await loadDistrictsByCityId(selected);
                }}
                className={inputCls(touched.city && errors.city, !selectOptions.cities.length)}
                disabled={!selectOptions.cities.length}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.cities.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
              <FieldError error={errors.city} touched={touched.city} />
            </div>
            <div className="flex flex-col gap-1" data-tour="client-district">
              <label className={labelCls}>Localidad</label>
              <select
                value={values.district?.value || ''}
                onChange={(e) => {
                  const selected = selectOptions.districts.find(o => String(o.value) === e.target.value) || null;
                  setFieldValue('district', selected);
                }}
                className={inputCls(touched.district && errors.district, !selectOptions.districts.length)}
                disabled={!selectOptions.districts.length}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.districts.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
              <FieldError error={errors.district} touched={touched.district} />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className={labelCls}>Dirección</label>
              <input
                name="address"
                value={values.address}
                onChange={handleChange}
                placeholder="Calle y número"
                className={inputCls(false)}
              />
            </div>
          </SectionCard>

          {/* 3. Datos de Facturación */}
          <SectionCard icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />} title="Datos de Facturación">
            <div className="flex flex-col gap-1" data-tour="client-iva-condition">
              <label className={labelCls}>Condición de IVA</label>
              <select
                value={values.ivaCondition?.value || ''}
                onChange={(e) => {
                  const selected = selectOptions.ivaCondition.find(o => String(o.value) === e.target.value) || null;
                  setFieldValue('ivaCondition', selected);
                }}
                className={inputCls(touched.ivaCondition && errors.ivaCondition)}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.ivaCondition.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
              <FieldError error={errors.ivaCondition} touched={touched.ivaCondition} />
            </div>
            <div className="flex flex-col gap-1" data-tour="client-price-list">
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className={`${labelCls} !mb-0`}>¿Se le factura con lista de precios?</label>
                <HelpTooltip text={PRICE_LIST_HELP} />
              </div>
              <div className="flex items-center justify-between h-11 bg-surface-low/50 px-4 rounded-lg">
                <span className="text-sm font-medium text-on-surface-muted">{values.usesPriceList ? 'Sí' : 'No'}</span>
                <Switch
                  checked={values.usesPriceList}
                  ariaLabel="¿Se le factura con lista de precios?"
                  onChange={(checked) => {
                    setFieldValue('usesPriceList', checked);
                    if (!checked) {
                      setFieldValue('priceList', null);
                      setFieldTouched('priceList', false, false);
                    }
                  }}
                />
              </div>
            </div>
            {values.usesPriceList && (
              <div className="flex flex-col gap-1" data-tour="client-price-list-select">
                <label className={labelCls}>Lista de Precios</label>
                <select
                  value={values.priceList?.value || ''}
                  onChange={(e) => {
                    const selected = selectOptions.priceLists.find(o => String(o.value) === e.target.value) || null;
                    setFieldValue('priceList', selected);
                  }}
                  className={inputCls(touched.priceList && errors.priceList)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.priceLists.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.priceList} touched={touched.priceList} />
              </div>
            )}
          </SectionCard>

          {/* 4. Saldo de cuenta corriente */}
          <SectionCard icon={<AccountBalanceWalletIcon sx={{ fontSize: 20 }} />} title="Cuenta Corriente">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Saldo inicial</label>
              <AmountInput
                name="checkingAccount"
                value={values.checkingAccount}
                onChange={(raw) => setFieldValue('checkingAccount', raw)}
                hasError={touched.checkingAccount && Boolean(errors.checkingAccount)}
                allowNegative
              />
              <p className="mt-1 text-xs text-on-surface-muted">Positivo: el cliente tiene deuda. Negativo: el cliente tiene saldo a favor.</p>
            </div>
          </SectionCard>

          {/* 5. Fecha de Inicio de Ventas */}
          <SectionCard icon={<CalendarTodayIcon sx={{ fontSize: 20 }} />} title="Fecha de inicio de ventas">
            <div className="flex flex-col gap-1" data-tour="client-sales-start">
              <label className={labelCls}>Fecha de inicio</label>
              <BasicDatePicker
                value={values.salesStartDate}
                onChange={(date) => setFieldValue('salesStartDate', date)}
                hasError={touched.salesStartDate && Boolean(errors.salesStartDate)}
              />
              <FieldError error={errors.salesStartDate} touched={touched.salesStartDate} />
            </div>
          </SectionCard>

          {/* 5. Contacto */}
          <SectionCard icon={<PhoneIcon sx={{ fontSize: 20 }} />} title="Contacto">
            <div className="flex flex-col gap-1" data-tour="client-phone">
              <label className={labelCls}>Teléfono</label>
              <input
                name="phone"
                type="tel"
                value={formatTelefono(values.phone)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFieldValue('phone', raw);
                }}
                placeholder="11-XXXX-XXXX"
                className={inputCls(false)}
              />
            </div>
          </SectionCard>

          {/* 6. Estado */}
          <SectionCard icon={<VerifiedUserIcon sx={{ fontSize: 20 }} />} title="Estado">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className={`${labelCls} !mb-0`}>Estado</label>
                <HelpTooltip text={STATE_HELP} />
              </div>
              <div className="flex items-center justify-between h-11 bg-surface-low/50 px-4 rounded-lg">
                <span className="text-sm font-medium text-on-surface-muted">
                  {values.state ? 'Cliente activo' : 'Cliente inactivo'}
                </span>
                <Switch
                  checked={values.state}
                  ariaLabel="Cliente activo"
                  onChange={(checked) => setFieldValue('state', checked)}
                />
              </div>
            </div>
          </SectionCard>

          <FormActions
            onCancel={() => navigate('/client')}
            confirmType="submit"
            confirmLabel={isSubmitting ? 'Guardando...' : id ? 'Guardar cambios' : 'Registrar Cliente'}
            confirmDisabled={isSubmitting || !validationSchema.isValidSync(values)}
          />

        </Form>
      )}
    </Formik>
  );
};

export default ClientForm;
