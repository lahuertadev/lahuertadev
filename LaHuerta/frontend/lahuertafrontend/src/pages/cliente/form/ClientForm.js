import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadOptions } from '../../../utils/selectOptions';
import { clientUrl, billingTypeUrl, ConditionIvaTypeUrl, provincesUrl, priceListUrl } from '../../../constants/urls';
import Toast from '../../../components/Toast';
import BasicDatePicker from '../../../components/DatePicker';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PhoneIcon from '@mui/icons-material/Phone';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

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

// ── Componente principal ──────────────────────────────────────────────────────
const ClientForm = () => {
  const [selectOptions, setSelectOptions] = useState({
    billingType: [],
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
    billingType: null,
    ivaCondition: null,
    priceList: null,
    phone: '',
    salesStartDate: null,
    state: true,
    checkingAccount: 0,
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, message: '' });

  const loadInitialOptions = async () => {
    const billingType = await loadOptions(billingTypeUrl, (data) =>
      data.map((item) => ({ name: item.descripcion, value: item.id }))
    );
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
    setSelectOptions({ billingType, ivaCondition, provinces, cities: [], districts: [], priceLists });
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
        billingType: { name: data.tipo_facturacion.descripcion, value: data.tipo_facturacion.id },
        ivaCondition: { name: data.condicion_IVA.descripcion, value: data.condicion_IVA.id },
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
    billingType: Yup.object().nullable().required('El Tipo de Facturación es obligatorio'),
    ivaCondition: Yup.object().nullable().required('La Condición de IVA es obligatoria'),
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
    tipo_facturacion: values.billingType?.value,
    condicion_IVA: values.ivaCondition?.value,
    lista_precios: values.priceList?.value || null,
    telefono: values.phone,
    fecha_inicio_ventas: values.salesStartDate,
    nombre_fantasia: values.fantasyName,
    estado: values.state,
    cuenta_corriente: values.checkingAccount ?? 0,
  });

  const handleSubmit = async (values) => {
    try {
      const mappedValues = mapFormDataToBackend(values);
      if (id) {
        await axios.put(`${clientUrl}${id}/`, mappedValues);
      } else {
        await axios.post(clientUrl, mappedValues);
      }
      navigate('/client');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
      const msg = error?.response?.data?.error || error?.response?.data?.detail || 'Error al guardar. Verificá que los datos no estén duplicados.';
      setToast({ open: true, message: msg });
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
      {({ values, errors, touched, handleChange, setFieldValue }) => (
        <Form className="w-full max-w-5xl mx-auto space-y-8 pb-12">
          <Toast
            open={toast.open}
            message={toast.message}
            onClose={() => setToast({ open: false, message: '' })}
          />

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm font-medium text-on-surface-muted">
            <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/')}>Home</span>
            <span className="text-xs">›</span>
            <span className="hover:text-blue-lahuerta cursor-pointer transition-colors" onClick={() => navigate('/client')}>Clientes</span>
            <span className="text-xs">›</span>
            <span className="text-on-surface font-semibold">{id ? 'Editar' : 'Nuevo'}</span>
          </nav>

          {/* 1. Datos de la Empresa */}
          <SectionCard icon={<BusinessIcon sx={{ fontSize: 20 }} />} title="Datos de la Empresa">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>CUIT</label>
              <input
                name="cuit"
                value={values.cuit}
                onChange={handleChange}
                placeholder="20-XXXXXXXX-X"
                className={inputCls(touched.cuit && errors.cuit)}
              />
              <FieldError error={errors.cuit} touched={touched.cuit} />
            </div>
            <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Provincia</label>
              <select
                value={values.province?.value || ''}
                onChange={async (e) => {
                  const selected = selectOptions.provinces.find(o => String(o.value) === e.target.value) || null;
                  await loadCitiesByProvinceId(selected);
                  setFieldValue('province', selected);
                  setFieldValue('city', null);
                  setFieldValue('district', null);
                }}
                className={inputCls(false)}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.provinces.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Municipio</label>
              <select
                value={values.city?.value || ''}
                onChange={async (e) => {
                  const selected = selectOptions.cities.find(o => String(o.value) === e.target.value) || null;
                  await loadDistrictsByCityId(selected);
                  setFieldValue('city', selected);
                  setFieldValue('district', null);
                }}
                className={inputCls(false)}
                disabled={!selectOptions.cities.length}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.cities.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Localidad</label>
              <select
                value={values.district?.value || ''}
                onChange={(e) => {
                  const selected = selectOptions.districts.find(o => String(o.value) === e.target.value) || null;
                  setFieldValue('district', selected);
                }}
                className={inputCls(false)}
                disabled={!selectOptions.districts.length}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.districts.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
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
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Tipo de Facturación</label>
              <select
                value={values.billingType?.value || ''}
                onChange={(e) => {
                  const selected = selectOptions.billingType.find(o => String(o.value) === e.target.value) || null;
                  setFieldValue('billingType', selected);
                }}
                className={inputCls(touched.billingType && errors.billingType)}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.billingType.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
              <FieldError error={errors.billingType} touched={touched.billingType} />
            </div>
            <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Lista de Precios</label>
              <select
                value={values.priceList?.value || ''}
                onChange={(e) => {
                  const selected = selectOptions.priceLists.find(o => String(o.value) === e.target.value) || null;
                  setFieldValue('priceList', selected);
                }}
                className={inputCls(false)}
              >
                <option value="">Seleccionar...</option>
                {selectOptions.priceLists.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
            </div>
          </SectionCard>

          {/* 4. Fecha de inicio de ventas */}
          <SectionCard icon={<CalendarTodayIcon sx={{ fontSize: 20 }} />} title="Fecha de inicio de ventas">
            <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Teléfono</label>
              <input
                name="phone"
                type="tel"
                value={values.phone}
                onChange={handleChange}
                placeholder="+54 11 XXXX-XXXX"
                className={inputCls(false)}
              />
            </div>
          </SectionCard>

          {/* 6. Estado */}
          <SectionCard icon={<VerifiedUserIcon sx={{ fontSize: 20 }} />} title="Estado">
            <div className="flex items-center justify-between h-11 bg-surface-low/50 px-4 rounded-lg">
              <span className="text-sm font-medium text-on-surface-muted">Cliente activo</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.state}
                  onChange={(e) => setFieldValue('state', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-lahuerta after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
          </SectionCard>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => navigate('/client')}
              className="px-6 py-2.5 text-sm font-semibold text-on-surface-muted hover:bg-surface-low rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 bg-blue-lahuerta text-white font-bold text-sm rounded-lg shadow-sm hover:bg-blue-lahuerta/90 active:scale-[0.98] transition-all"
            >
              {id ? 'Guardar cambios' : 'Registrar Cliente'}
            </button>
          </div>

        </Form>
      )}
    </Formik>
  );
};

export default ClientForm;
