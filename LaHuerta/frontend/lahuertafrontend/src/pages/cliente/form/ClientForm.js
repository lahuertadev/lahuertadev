import React, { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Componentes personalizados
import CustomInput from '../../../components/Input';
import BasicSelect from '../../../components/Select';
import BasicDatePicker from '../../../components/DatePicker';
import IconLabelButtons from '../../../components/Button';
import CheckboxLabels from '../../../components/Checkbox';
import { loadOptions } from '../../../utils/selectOptions';
import { clientUrl, billingTypeUrl, ConditionIvaTypeUrl, provincesUrl, priceListUrl } from '../../../constants/urls';


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
        checkingAccount: '',
        province: '', 
        city: {name: '', value: ''}, 
        district: '',
        address: '',
        billingType: '',
        ivaCondition: '',
        priceList: '',
        phone: '',
        salesStartDate: null,
        fantasyName: '',
        state: true,
      });

  const [itemToEdit] = useState(initialValues || null);

  const { id } = useParams();
  const navigate = useNavigate();

  //* Carga los selects iniciales del formulario
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

  //* Función para cargar los municipios filtrados por provincia
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
    setSelectOptions((prev) => ({...prev, cities, districts: [] }));
  };
  
  //* Función para cargar las localidades filtradas por municipio
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
    setSelectOptions((prev) => ({...prev, districts }));
    // setInitialValues((prev) => ({ ...prev, district: '' }));
  };

  //* Función para traer la información para editar un cliente
  const fetchItemToEdit = async () => {
    try {
      const response = await axios.get(`${clientUrl}${id}/`);
      const data = response.data;
      
      const province = {
        name: data.localidad.municipio.provincia.nombre,
        value: data.localidad.municipio.provincia.id,
      };
      const city = {
        name: data.localidad.municipio.nombre,
        value: data.localidad.municipio.id,
      };
      const district = {
        name: data.localidad.nombre,
        value: data.localidad.id,
      };


      await loadCitiesByProvinceId(province);
      await loadDistrictsByCityId(city);

      setInitialValues({
        cuit: data.cuit,
        businessName: data.razon_social,
        checkingAccount: data.cuenta_corriente,
        province, 
        city,
        district,
        address: data.domicilio,
        billingType: { name: data.tipo_facturacion.descripcion, value: data.tipo_facturacion.id },
        ivaCondition: { name: data.condicion_IVA.descripcion, value: data.condicion_IVA.id },
        priceList: data.lista_precios
          ? { name: data.lista_precios.nombre, value: data.lista_precios.id }
          : '',
        phone: data.telefono,
        salesStartDate: data.fecha_inicio_ventas,
        fantasyName: data.nombre_fantasia,
        state: data.estado,
      });
    } catch (error) {
      console.error('Error al cargar el cliente para la edición: ', error);
    }
  }

  //* Validaciones del formulario
  const validationSchema = Yup.object({
    cuit: Yup.string().required('CUIT es obligatorio'),
    businessName: Yup.string().required('Razón Social es obligatoria'),
    billingType: Yup.object().required('El Tipo de Facturación es obligatorio'),
    ivaCondition: Yup.object().required('La Condición de IVA es obligatoria'),
    salesStartDate: Yup.string().required('Fecha de inicio de ventas es obligatoria'),
  });

  //* Función para mapear los datos ingresados con lo que espera el back
  const mapFormDataToBackend = (values) => {
    const mappedData = {
      cuit: values.cuit,
      razon_social: values.businessName,
      localidad: {
        'id': values.district.value,
        'nombre': values.district.name,
        'municipio': {
          'id': values.city.value,
          'nombre': values.city.name,
          'provincia': {
            'id': values.province.value,
            'nombre': values.province.name
          }
        }
      },
      domicilio: values.address,
      tipo_facturacion: values.billingType.value,
      condicion_IVA: values.ivaCondition.value,
      lista_precios: values.priceList?.value || null,
      telefono: values.phone,
      fecha_inicio_ventas: values.salesStartDate,
      nombre_fantasia: values.fantasyName,
      estado: values.state,
    };
    return mappedData
  };

  //* Manejo del envío del formulario
  const handleSubmit = async (values) => {
    const mappedValues = mapFormDataToBackend(values);
    try {
      if (itemToEdit && id) {
        await axios.put(`${clientUrl}${id}/`, mappedValues);
      } else if (clientUrl) {
        await axios.post(clientUrl, mappedValues);
      }
      navigate('/client');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
    }
  };

  //* Carga de los elementos del formulario
  useEffect(() => {
    const loadFormOptions = async () => {
      await loadInitialOptions();
      if (id){
        await fetchItemToEdit();
      }
    };
    loadFormOptions();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, handleChange, setFieldValue }) => (
        <div className="min-h-screen flex items-center justify-center bg-transparent flex-1">
          <Form className="bg-white p-8 rounded-lg shadow-lg w-full max-w-3xl space-y-8">
            {/* Sección de Datos de Empresa */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Datos empresa</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* CUIT */}
                <Field
                  as={CustomInput}
                  label="CUIT"
                  name="cuit"
                  required
                  className="col-span-1"
                  onChange={handleChange}
                />
                {/* Razón Social */}
                <Field
                  as={CustomInput}
                  label="Razón social"
                  name="businessName"
                  required
                  className="col-span-2"
                  onChange={handleChange}
                />
                {/* Nombre Fantasía */}
                <Field
                  as={CustomInput}
                  label="Nombre fantasía"
                  name="fantasyName"
                  required
                  className="col-span-2"
                  onChange={handleChange}
                />
              </div>
            </div>
  
            {/* Sección de Datos de Dirección */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Datos de dirección</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Provincia */}
                <BasicSelect
                  label="Provincia"
                  name="province"
                  value={values.province}
                  options={selectOptions.provinces}
                  className="col-span-1"
                  onChange={async (e) => {
                    const selectedProvince = e.target.value;
                    await loadCitiesByProvinceId(selectedProvince);
                    setFieldValue('province', selectedProvince);
                  }}
                />
  
                {/* Municipio */}
                <BasicSelect
                  label="Municipio"
                  name="city"
                  value={values.city}
                  options={selectOptions.cities}
                  className="col-span-1"
                  onChange={async (e) => {
                    const selectedCity = e.target.value;
                    await loadDistrictsByCityId(selectedCity);
                    setFieldValue('city', selectedCity);
                  }}
                />
                {/* Localidad (ancho de 2 columnas) */}
                <BasicSelect
                  label="Localidad"
                  name="district"
                  value={values.district}
                  options={selectOptions.districts}
                  className="col-span-2"
                  onChange={handleChange}
                />
              </div>
              {/* Dirección */}
              <Field
                as={CustomInput}
                label="Dirección"
                name="address"
                className="col-span-3"
                onChange={handleChange}
              />
            </div>
  
            {/* Sección de Facturación */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Datos de facturación</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Tipo de Facturación */}
                <BasicSelect
                  label="Tipo de facturación"
                  name="billingType"
                  value={values.billingType}
                  options={selectOptions.billingType}
                  className="col-span-1"
                  onChange={handleChange}
                />
                {/* Condición de IVA */}
                <BasicSelect
                  label="Condición de IVA"
                  name="ivaCondition"
                  value={values.ivaCondition}
                  options={selectOptions.ivaCondition}
                  className="col-span-2"
                  onChange={handleChange}
                />
                {/* Lista de precios */}
                <BasicSelect
                  label="Lista de precios"
                  name="priceList"
                  value={values.priceList}
                  options={selectOptions.priceLists}
                  className="col-span-3"
                  onChange={handleChange}
                />
              </div>
            </div>
  
            {/* Sección de Fecha de Inicio de Ventas */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Fecha de inicio de ventas</h3>
              <div className="grid grid-cols-1 gap-4">
                <BasicDatePicker
                  label="Fecha"
                  name="salesStartDate"
                  value={values.salesStartDate}
                  onChange={(value) => setFieldValue('salesStartDate', value)}
                />
              </div>
            </div>
  
            {/* Sección de Contacto */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Datos de contacto</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Teléfono */}
                <Field
                  as={CustomInput}
                  label="Teléfono"
                  name="phone"
                  className="col-span-3"
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Estado</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Estado */}
                <CheckboxLabels
                  label='Estado'
                  name='state'
                  value={values['state']} 
                  onChange={setFieldValue}
                />
              </div>
            </div>
  
            {/* Botón de envío */}
            <div className="mt-8 flex justify-center">
              <IconLabelButtons
                label="Guardar"
                variant="contained"
                color="primary"
                size="large"
                type="submit"
              />
            </div>
  
            {/* Mostrar errores */}
            {Object.keys(errors).map((key) =>
              touched[key] && errors[key] ? (
                <div key={key} className="text-red-500 text-sm mt-2">
                  {errors[key]}
                </div>
              ) : null
            )}
          </Form>
        </div>
      )}
    </Formik>
  );
  
  
};

export default ClientForm;
