import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import axios from 'axios';
import GenericForm from '../../../components/Form';
import { clientUrl, billingTypeUrl, ivaConditionUrl, provincesUrl } from '../../../constants/urls';
import { useParams } from 'react-router-dom';
import { loadOptions } from '../../../utils/selectOptions';


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
    state: true,
  });
  // const location = useLocation();
  const { id } = useParams();

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
  const loadCitiesByProvinceId = async (province) => {
    const citiesUrl = `https://apis.datos.gob.ar/georef/api/municipios?provincia=${province.value}&campos=id,nombre&max=150`;

    const cities = await loadOptions(citiesUrl, (data) =>
      [...data.municipios]
        .map((item) => ({ name: item.nombre, value: item.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    setSelectOptions((prev) => ({...prev, cities, districts: [] }));
    setInitialValues((prev) => ({ ...prev, city: '', district: '' }));
  };
  
  //* Función para cargar las localidades filtradas por municipio
  const loadDistrictsByCityId = async (city) => {
    const districtsUrl = `https://apis.datos.gob.ar/georef/api/localidades?municipio=${city.value}&campos=id,nombre&max=50`;

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

        const provinces = await loadOptions(provincesUrl, (data) =>
          [...data.provincias]
              .map((item) => ({ name: item.nombre, value: item.id }))
              .sort((a, b) => a.name.localeCompare(b.name))
        );
        setSelectOptions((prev) => ({ ...prev, provinces }));
        console.log('Estas son las opciones cargadas: ', selectOptions)

        const province = { name: data.localidad.municipio.provincia.nombre, value: data.localidad.municipio.provincia.id };
        const city = { name: data.localidad.municipio.nombre, value: data.localidad.municipio.id };
        const district = { name: data.localidad.nombre, value: data.localidad.id };

        await loadCitiesByProvinceId(province);
        await loadDistrictsByCityId(city);
        
        setInitialValues({
          cuit: data.cuit,
          businessName: data.razon_social,
          checkingAccount: data.cuenta_corriente,
          province: province, 
          city: city,
          district: district,
          address: data.domicilio,
          billingType: {name: data.tipo_facturacion.descripcion, value: data.tipo_facturacion.id },
          ivaCondition: {name: data.condicion_IVA.descripcion, value: data.condicion_IVA.id},
          phone: data.telefono,
          salesStartDate: data.fecha_inicio_ventas,
          fantasyName: data.nombre_fantasia,
          state: data.estado,
      });
      console.log('Asi quedan los valores iniciales: ', initialValues)
        
      
      } catch (error) {
        console.error('Error al cargar el cliente para la edición: ', error);
      }
    } else {
      setInitialValues({
        cuit: '',
        businessName: '',
        checkingAccount: '',
        province: '', 
        city: '', 
        district: '',
        address: '',
        billingType: '',
        ivaCondition: '',
        phone: '',
        salesStartDate: null,
        fantasyName: '',
        state: true,
      });
    }
  };

  //* Función para mapear los datos ingresados con lo que espera el back
  const mapFormDataToBackend = (values) => {
    const mappedData = {
      cuit: values.cuit,
      razon_social: values.businessName,
      cuenta_corriente: 0.00,
      localidad: {
        'id': values.districts.value,
        'nombre': values.districts.name,
        'municipio': {
          'id': values.cities.value,
          'nombre': values.cities.name,
          'provincia': {
            'id': values.provinces.value,
            'nombre': values.provinces.name
          }
        }
      },
      domicilio: values.address,
      tipo_facturacion: values.billingType.value,
      condicion_IVA: values.ivaCondition.value,
      telefono: values.phone,
      fecha_inicio_ventas: values.salesStartDate,
      nombre_fantasia: values.fantasyName,
      estado: values.state,
    };
    console.log('Asi es como se van a enviar los datos: ', mappedData)


    return mappedData
  };

  //* Configuración de los campos del formulario
  const fields = [
    { 
      name: 'cuit', 
      label: 'CUIT', type: 
      'text', 
      validation: {
        regex: /^\d{1,11}$/, 
        errorMessage: 'El CUIT debe ser un número de hasta 11 dígitos sin caracteres especiales',
      },
      required: true,
    },
    { 
      name: 'businessName', 
      label: 'Razón Social', 
      type: 'text',
      validation: {
        regex: /^[a-zA-Z0-9\s\-.]{1,70}$/,
        errorMessage: 'La razón social no puede contener caracteres especiales o excederse de los 70 caracteres',
      },
      required: true
    },
    // { 
    //   name: 'checkingAccount', 
    //   label: 'Cuenta Corriente', 
    //   type: 'number',
    //   validation: {
    //     regex: /^\d+(\.\d+)?$/,
    //     errorMessage: 'La cuenta corriente no puede tener valores negativos',
    //   },
    // },
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
    { 
      name: 'address', 
      label: 'Dirección', 
      type: 'text',
      required: true,
      validation: {
        regex: /^[a-zA-Z0-9\s\-.]{1,200}$/,
        errorMessage: 'La dirección no puede contener caracteres especiales o excederse de los 200 caracteres ',
      }
    },
    { name: 'billingType', label: 'Tipo de Facturación', type: 'select' },
    { name: 'ivaCondition', label: 'Condición de IVA', type: 'select' },
    { name: 'phone', label: 'Teléfono', type: 'text' },
    { name: 'salesStartDate', label: 'Fecha de Inicio de Ventas', type: 'date' },
    { 
      name: 'fantasyName', 
      label: 'Nombre de Fantasía', 
      type: 'text',
      validation: {
        regex: /^[a-zA-Z0-9\s\-.&*(),]{1,100}$/,
        errorMessage: 'El nombre de fantasía no puede exceder los 100 caracteres ni usar "@, #, /, \, %" ',
      } 
    },
    { name: 'state', label: 'Estado cliente', type: 'checkbox' },
  ];

  //* Esquema de validación con Yup
  const validationSchema = Yup.object().shape({
    cuit:  Yup.string()
      .matches(/^\d{11}$/, 'El CUIT debe ser un número de exactamente 11 dígitos sin caracteres especiales')
      .required('Requerido'),
    // businessName: Yup.string().required('Requerido'),
    // provinces: Yup.string()
    //   .required('La provincia es requerida')
    //   .oneOf(selectOptions.provinces.map(option => option.value), 'Seleccione una provincia válida'),
    // cities: Yup.string()
    //   .required('El municipio es requerido')
    //   .oneOf(selectOptions.cities.map(option => option.value), 'Seleccioná una opción'),
    // districts:Yup.string()
    //   .required('La localidad es requerida')
    //   .oneOf(selectOptions.districts.map(option => option.value), 'Seleccioná una opción'),
    // address: Yup.string().required('Requerido'),
    // billingType: Yup.number()
    //   .required('El tipo de facturación es requerido')
    //   .oneOf(selectOptions.billingType.map(option => option.value), 'Seleccioná una opción'),
    // ivaCondition: Yup.number()
    //   .required('La condición de IVA es requerida')
    //   .oneOf(selectOptions.ivaCondition.map(option => option.value), 'Seleccioná una opción'),
    // phone: Yup.string().required('Requerido')
  });

  useEffect(() => {
    loadInitialOptions();
    fetchItemToEdit()
    console.log('Estos son los valores iniciales 2: ', initialValues)
  }, [id]);

  //* URLs para creación y edición
  const urls = {
    baseUrl: clientUrl,
    list: '/client'
  };

  return (
    <GenericForm
      fields={fields}
      initialValues={initialValues}
      validationSchema={validationSchema} 
      selectOptions={selectOptions}
      urls={urls}
      mapFormDataToBackend={mapFormDataToBackend} 
      onSubmitCallback={() => console.log('Formulario enviado con éxito')}
      columns={3}
    />
  );
};

export default ClientForm;