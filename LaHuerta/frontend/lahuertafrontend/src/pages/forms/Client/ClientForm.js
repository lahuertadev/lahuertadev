import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import axios from 'axios';
import GenericForm from '../../../components/Form';
import { clientUrl, billingTypeUrl, ivaConditionUrl, provincesUrl } from '../../../constants/urls';
import { useLocation, useParams } from 'react-router-dom';


const ClientForm = () => {
  const [selectOptions, setSelectOptions] = useState({
    billingType: [],
    ivaCondition: [],
    provinces: [],
    cities: [],
    districts: []
  });
  const [initialValues, setInitialValues] = useState({
    cuit: '',
    businessName: '',
    checkingAccount: '',
    provinces: '', 
    cities: '', 
    districts: '',
    address: '',
    billingType: '',
    ivaCondition: '',
    phone: '',
    salesStartDate: null,
    fantasyName: '',
    state: '',
  });
  const location = useLocation();
  const { id } = useParams();

  //* Función que carga las opciones para los selects. 
  const loadOptions = async (url, mapper) => {
    try {
      const response = await axios.get(url);
      return mapper(response.data);
    } catch (error){
      console.error(`Error al obtener los datos de ${url}: `, error);
      return [];
    }
  }

  //* Carga los valores iniciales
  const loadInitialOptions = async () => {

    const billingType = await loadOptions(billingTypeUrl, (data) =>
      data.map((item) => ({ name : item.descripcion, value: item.id}))
    );

    const ivaCondition = await loadOptions(ivaConditionUrl, (data) =>
      data.map((item) => ({ name: item.descripcion, value: item.id }))
    );

    const provinces = await loadOptions(provincesUrl, (data) =>
      [...data.provincias]
        .map((item) => ({ name: item.nombre, value: item.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setSelectOptions({ billingType, ivaCondition, provinces, cities: [], districts: [] });
  };


  //* Función para cargar los municipios filtrados por provincia
  const loadCitiesByProvinceId = async (provinceId) => {
    const citiesUrl = `https://apis.datos.gob.ar/georef/api/municipios?provincia=${provinceId}&campos=id,nombre&max=150`;

    const cities = await loadOptions(citiesUrl, (data) =>
      [...data.municipios]
        .map((item) => ({ name: item.nombre, value: item.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    setSelectOptions((prev) => ({...prev, cities, districts: [] }));
    setInitialValues((prev) => ({ ...prev, city: '', district: '' }));
  };
  
  //* Función para cargar las localidades filtradas por municipio
  const loadDistrictsByCityId = async (cityId) => {
    const districtsUrl = `https://apis.datos.gob.ar/georef/api/localidades?municipio=${cityId}&campos=id,nombre&max=50`;

    const districts = await loadOptions(districtsUrl, (data) =>
      [...data.localidades]
        .map((item) => ({ name: item.nombre, value: item.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    setSelectOptions((prev) => ({...prev, districts }));
    setInitialValues((prev) => ({ ...prev, district: '' }));
  };


  //* Función para traer la información para editar un gasto
  const fetchItemToEdit = async () => {
    if (id) {
      try {
        const response = await axios.get(`${clientUrl}${id}`);
        const data = response.data;

        setInitialValues({
          cuit: data.cuit,
          businessName: data.razon_social,
          checkingAccount: data.cuenta_corriente,
          province: '', // Provincia
          city: '', // Municipio
          district: '', // Localidad
          address: data.domicilio,
          billingType: data.tipo_facturacion.descripcion,
          ivaCondition: data.condicion_iva.descripcion,
          phone: data.telefono,
          salesStartDate: data.fecha_inicio_ventas,
          fantasyName: data.nombre_fantasia,
          state: data.estado,
      });
      } catch (error) {
        console.error('Error al cargar el cliente para la edición: ', error);
      }
    } else {
      setInitialValues({
        cuit: '',
        businessName: '',
        checkingAccount: '',
        province: '', // Provincia
        city: '', // Municipio
        district: '', // Barrio
        address: '',
        billingType: '',
        ivaCondition: '',
        phone: '',
        salesStartDate: null,
        fantasyName: '',
        state: '',
      });
    }
  };

  //* Función para mapear los datos ingresados con lo que espera el back
  const mapFormDataToBackend = (values) => {
    return {
      cuit: values.cuit,
      razon_social: values.businessName,
      cuenta_corriente: values.checkingAccount,
      // provincia: values.province,
      // municipio: values.city,
      // localidad: values.district,
      direccion: values.address,
      tipo_facturacion: values.billingType,
      condicion_iva: values.ivaCondition,
      telefono: values.phone,
      fecha_inicio: values.salesStartDate,
      nombre_fantasia: values.fantasyName,
      estado: values.state,
    };
  };

  //* Configuración de los campos del formulario
  const fields = [
    { name: 'cuit', label: 'CUIT', type: 'text', required: true },
    { name: 'businessName', label: 'Razón Social', type: 'text', required: true },
    { name: 'checkingAccount', label: 'Cuenta Corriente', type: 'text' },
    { 
      name: 'provinces', 
      label: 'Provincia', 
      type: 'select',
      onChange: (e) => {
        const provinceId = e.target.value; 
        loadCitiesByProvinceId(provinceId); 
      }
    },
    { 
      name: 'cities', 
      label: 'Municipio', 
      type: 'select',
      onChange: (e) => {
        const cityId = e.target.value; 
        loadDistrictsByCityId(cityId); 
      }
    },
    { 
      name: 'districts', 
      label: 'Localidad', 
      type: 'select',
    },
    { name: 'address', label: 'Dirección', type: 'text' },
    { name: 'billingType', label: 'Tipo de Facturación', type: 'select' },
    { name: 'ivaCondition', label: 'Condición de IVA', type: 'select' },
    { name: 'phone', label: 'Teléfono', type: 'text' },
    { name: 'salesStartDate', label: 'Fecha de Inicio de Ventas', type: 'date' },
    { name: 'fantasyName', label: 'Nombre de Fantasía', type: 'text' },
    { name: 'state', label: 'Estado', type: 'text' },
  ];

  //* Esquema de validación con Yup
  const validationSchema = Yup.object().shape({
    cuit: Yup.string().required('Requerido').length(11, 'Debe tener 11 dígitos'),
    businessName: Yup.string().required('Requerido'),
    province: Yup.string().required('Requerido'),
    city: Yup.string().required('Requerido'),
  });

  useEffect(() => {
    loadInitialOptions();
    fetchItemToEdit()
  }, [id]);

  //* URLs para creación y edición
  const urls = {
    baseUrl: clientUrl,
    list: '/client'
  };

  return (
    <GenericForm
      fields={fields} // Campos a renderizar
      initialValues={initialValues} // Valores iniciales por si es una edición
      validationSchema={validationSchema} // Validaciones para los campos
      selectOptions={selectOptions} // Opciones del select
      urls={urls} // Urls necesarias
      mapFormDataToBackend={mapFormDataToBackend} // Mapeo de datos para el endpoint del back
      onSubmitCallback={() => console.log('Formulario enviado con éxito')} // Mensaje de envio exitoso
      columns={3}
    />
  );
};

export default ClientForm;