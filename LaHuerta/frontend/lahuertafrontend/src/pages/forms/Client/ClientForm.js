// import React, { useEffect, useState } from 'react';
// import * as Yup from 'yup';
// import axios from 'axios';
// import GenericForm from '../../../components/Form';
// import { clientUrl, billingTypeUrl, ivaConditionUrl, provincesUrl } from '../../../constants/urls';
// import { useParams } from 'react-router-dom';
// import { loadOptions } from '../../../utils/selectOptions';


// const ClientForm = () => {
//   const [selectOptions, setSelectOptions] = useState({
//     billingType: [],
//     ivaCondition: [],
//     provinces: [],
//     cities: [],
//     districts: []
//   });
//   const [initialValues, setInitialValues] = useState({
//     cuit: '',
//     businessName: '',
//     checkingAccount: '',
//     provinces: '', 
//     cities: '', 
//     districts: '',
//     address: '',
//     billingType: '',
//     ivaCondition: '',
//     phone: '',
//     salesStartDate: null,
//     fantasyName: '',
//     state: true,
//   });

//   const { id } = useParams();

//   //* Carga los valores iniciales
//   const loadInitialOptions = async () => {

//     const billingType = await loadOptions(billingTypeUrl, (data) =>
//       data.map((item) => ({ name : item.descripcion, value: item.id}))
//     );

//     const ivaCondition = await loadOptions(ivaConditionUrl, (data) =>
//       data.map((item) => ({ name: item.descripcion, value: item.id }))
//     );

//     const provinces = await loadOptions(provincesUrl, (data) =>
//       [...data.provincias]
//         .map((item) => ({ name: item.nombre, value: item.id }))
//         .sort((a, b) => a.name.localeCompare(b.name))
//     );
//     setSelectOptions({ billingType, ivaCondition, provinces, cities: [], districts: [] });
//   };

//   //* Función para cargar los municipios filtrados por provincia
//   const loadCitiesByProvinceId = async (province) => {
//     const citiesUrl = `https://apis.datos.gob.ar/georef/api/municipios?provincia=${province.value}&campos=id,nombre&max=150`;

//     const cities = await loadOptions(citiesUrl, (data) =>
//       [...data.municipios]
//         .map((item) => ({ name: item.nombre, value: item.id }))
//         .sort((a, b) => a.name.localeCompare(b.name))
//     );

//     setSelectOptions((prev) => ({...prev, cities, districts: [] }));
//     setInitialValues((prev) => ({ ...prev, city: '', district: '' }));
//   };
  
//   //* Función para cargar las localidades filtradas por municipio
//   const loadDistrictsByCityId = async (city) => {
//     const districtsUrl = `https://apis.datos.gob.ar/georef/api/localidades?municipio=${city.value}&campos=id,nombre&max=50`;

//     const districts = await loadOptions(districtsUrl, (data) =>
//       [...data.localidades]
//         .map((item) => ({ name: item.nombre, value: item.id }))
//         .sort((a, b) => a.name.localeCompare(b.name))
//     );

//     setSelectOptions((prev) => ({...prev, districts }));
//     setInitialValues((prev) => ({ ...prev, district: '' }));
//   };

//   //* Función para traer la información para editar un gasto
//   const fetchItemToEdit = async () => {
//     if (id) {
//       try {
        
//         const response = await axios.get(`${clientUrl}${id}`);
//         const data = response.data;

//         // useEffect(() => {
//         //   loadInitialOptions();
//         //   fetchItemToEdit()
//         //   console.log('Estos son los valores iniciales 2: ', initialValues)
//         // }, [id]);

//         const provinces = await loadOptions(provincesUrl, (data) =>
//           [...data.provincias]
//               .map((item) => ({ name: item.nombre, value: item.id }))
//               .sort((a, b) => a.name.localeCompare(b.name))
//         );
//         setSelectOptions((prev) => ({ ...prev, provinces }));
//         console.log('Estas son las opciones cargadas: ', selectOptions)

//         const province = { name: data.localidad.municipio.provincia.nombre, value: data.localidad.municipio.provincia.id };
//         const city = { name: data.localidad.municipio.nombre, value: data.localidad.municipio.id };
//         const district = { name: data.localidad.nombre, value: data.localidad.id };

//         await loadCitiesByProvinceId(province);
//         await loadDistrictsByCityId(city);
        
//         setInitialValues({
//           cuit: data.cuit,
//           businessName: data.razon_social,
//           checkingAccount: data.cuenta_corriente,
//           province: province, 
//           city: city,
//           district: district,
//           address: data.domicilio,
//           billingType: {name: data.tipo_facturacion.descripcion, value: data.tipo_facturacion.id },
//           ivaCondition: {name: data.condicion_IVA.descripcion, value: data.condicion_IVA.id},
//           phone: data.telefono,
//           salesStartDate: data.fecha_inicio_ventas,
//           fantasyName: data.nombre_fantasia,
//           state: data.estado,
//       });
//       console.log('Asi quedan los valores iniciales: ', initialValues)
        
      
//       } catch (error) {
//         console.error('Error al cargar el cliente para la edición: ', error);
//       }
//     } else {
//       setInitialValues({
//         cuit: '',
//         businessName: '',
//         checkingAccount: '',
//         province: '', 
//         city: '', 
//         district: '',
//         address: '',
//         billingType: '',
//         ivaCondition: '',
//         phone: '',
//         salesStartDate: null,
//         fantasyName: '',
//         state: true,
//       });
//     }
//   };

//   //* Función para mapear los datos ingresados con lo que espera el back
//   const mapFormDataToBackend = (values) => {
//     const mappedData = {
//       cuit: values.cuit,
//       razon_social: values.businessName,
//       cuenta_corriente: 0.00,
//       localidad: {
//         'id': values.districts.value,
//         'nombre': values.districts.name,
//         'municipio': {
//           'id': values.cities.value,
//           'nombre': values.cities.name,
//           'provincia': {
//             'id': values.provinces.value,
//             'nombre': values.provinces.name
//           }
//         }
//       },
//       domicilio: values.address,
//       tipo_facturacion: values.billingType.value,
//       condicion_IVA: values.ivaCondition.value,
//       telefono: values.phone,
//       fecha_inicio_ventas: values.salesStartDate,
//       nombre_fantasia: values.fantasyName,
//       estado: values.state,
//     };
//     console.log('Asi es como se van a enviar los datos: ', mappedData)


//     return mappedData
//   };

//   //* Configuración de los campos del formulario
//   const fields = [
//     { 
//       name: 'cuit', 
//       label: 'CUIT', type: 
//       'text', 
//       validation: {
//         regex: /^\d{1,11}$/, 
//         errorMessage: 'El CUIT debe ser un número de hasta 11 dígitos sin caracteres especiales',
//       },
//       required: true,
//     },
//     { 
//       name: 'businessName', 
//       label: 'Razón Social', 
//       type: 'text',
//       validation: {
//         regex: /^[a-zA-Z0-9\s\-.]{1,70}$/,
//         errorMessage: 'La razón social no puede contener caracteres especiales o excederse de los 70 caracteres',
//       },
//       required: true
//     },
//     // { 
//     //   name: 'checkingAccount', 
//     //   label: 'Cuenta Corriente', 
//     //   type: 'number',
//     //   validation: {
//     //     regex: /^\d+(\.\d+)?$/,
//     //     errorMessage: 'La cuenta corriente no puede tener valores negativos',
//     //   },
//     // },
//     { 
//       name: 'provinces', 
//       label: 'Provincia', 
//       type: 'select',
//       onChange: (e) => {
//         const provinceId = e.target.value; 
//         loadCitiesByProvinceId(provinceId); 
//       }
//     },
//     { 
//       name: 'cities', 
//       label: 'Municipio', 
//       type: 'select',
//       onChange: (e) => {
//         const cityId = e.target.value; 
//         loadDistrictsByCityId(cityId); 
//       }
//     },
//     { 
//       name: 'districts', 
//       label: 'Localidad', 
//       type: 'select',
//     },
//     { 
//       name: 'address', 
//       label: 'Dirección', 
//       type: 'text',
//       required: true,
//       validation: {
//         regex: /^[a-zA-Z0-9\s\-.]{1,200}$/,
//         errorMessage: 'La dirección no puede contener caracteres especiales o excederse de los 200 caracteres ',
//       }
//     },
//     { name: 'billingType', label: 'Tipo de Facturación', type: 'select' },
//     { name: 'ivaCondition', label: 'Condición de IVA', type: 'select' },
//     { name: 'phone', label: 'Teléfono', type: 'text' },
//     { name: 'salesStartDate', label: 'Fecha de Inicio de Ventas', type: 'date' },
//     { 
//       name: 'fantasyName', 
//       label: 'Nombre de Fantasía', 
//       type: 'text',
//       validation: {
//         regex: /^[a-zA-Z0-9\s\-.&*(),]{1,100}$/,
//         errorMessage: 'El nombre de fantasía no puede exceder los 100 caracteres ni usar "@, #, /, \, %" ',
//       } 
//     },
//     { name: 'state', label: 'Estado cliente', type: 'checkbox' },
//   ];

//   // //* Esquema de validación con Yup
//   // const validationSchema = Yup.object().shape({
//   //   cuit:  Yup.string()
//   //     .matches(/^\d{11}$/, 'El CUIT debe ser un número de exactamente 11 dígitos sin caracteres especiales')
//   //     .required('Requerido'),
//   //   businessName: Yup.string().required('Requerido'),
//   //   provinces: Yup.mixed()
//   //     .required('Requerido')
//   //     .test(
//   //       'is-valid-option',
//   //       'Seleccione una opción válida',
//   //       (value) => value !== null && value !== undefined && value !== ''
//   //     ),
//   //   // cities: Yup.mixed()
//   //   //   .required('Este campo es obligatorio')
//   //   //   .oneOf(options.map(option => option.value), 'Opción no válida'),
//   //   // districts: Yup.string()
//   //   //   .required('Requerido')
//   //   //   .test(
//   //   //     'is-valid-option',
//   //   //     'Seleccione una opción válida',
//   //   //     (value) => value !== null && value !== undefined && value !== ''
//   //   //   ),
//   //   address: Yup.string().required('Requerido'),
//   //   // billingType: Yup.string()
//   //   //   .required('Requerido')
//   //   //   .test(
//   //   //     'is-valid-option',
//   //   //     'Seleccione una opción válida',
//   //   //     (value) => value !== null && value !== undefined && value !== ''
//   //   //   ),
//   //   // ivaCondition: Yup.string()
//   //   //   .required('Requerido')
//   //   //   .test(
//   //   //     'is-valid-option',
//   //   //     'Seleccione una opción válida',
//   //   //     (value) => value !== null && value !== undefined && value !== ''
//   //   //   ),
//   //   phone: Yup.string().required('Requerido')
//   // });

//   useEffect(() => {
//     loadInitialOptions();
//     fetchItemToEdit()
//     console.log('Estos son los valores iniciales 2: ', initialValues)
//   }, [id]);

//   useEffect(() => {
//   loadCitiesByProvinceId(selectOptions.province)
//   }, [province])

//   useEffect(() => {
//   loadDistrictsByCityId(selectOptions.city)
//   }, [city])

//   //* URLs para creación y edición
//   const urls = {
//     baseUrl: clientUrl,
//     list: '/client'
//   };

//   return (
//     <GenericForm
//       fields={fields}
//       initialValues={initialValues}
//       validationSchema={validationSchema} 
//       selectOptions={selectOptions}
//       urls={urls}
//       mapFormDataToBackend={mapFormDataToBackend} 
//       onSubmitCallback={() => console.log('Formulario enviado con éxito')}
//       columns={3}
//     />
//   );
// };

// export default ClientForm;


import React, { useEffect, useState } from 'react';
import { Formik, Form, Field, useField } from 'formik';
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
import { clientUrl, billingTypeUrl, ConditionIvaTypeUrl, provincesUrl } from '../../../constants/urls';


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
        province: '', 
        city: {name: '', value: ''}, 
        district: '',
        address: '',
        billingType: '',
        ivaCondition: '',
        phone: '',
        salesStartDate: null,
        fantasyName: '',
        state: true,
      });

  const [province, setProvince] = useState(null);
  const [city, setCity] = useState(null);
  const [district, setDistrict] = useState(null);

  const [itemToEdit, setItemToEdit] = useState(initialValues || null);

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
  
    setSelectOptions({ billingType, ivaCondition, provinces, cities: [], districts: [] });
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
    console.log(cities)
    setSelectOptions((prev) => ({...prev, cities, districts: [] }));
    //setInitialValues((prev) => ({ ...prev, city: '', : '' }));
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

  //* Función para traer la información para editar un gasto
  const fetchItemToEdit = async () => {
    console.log('Entre en el fetchItemToEdit')
    try {
      const response = await axios.get(`${clientUrl}${id}`);
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
      setProvince(province)
      setCity(city)
      setDistrict(district)

      setInitialValues({
        cuit: data.cuit,
        businessName: data.razon_social,
        checkingAccount: data.cuenta_corriente,
        province, 
        city,
        district,
        address: data.domicilio,
        billingType: {name: data.tipo_facturacion.descripcion, value: data.tipo_facturacion.id },
        ivaCondition: {name: data.condicion_IVA.descripcion, value: data.condicion_IVA.id},
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
      cuenta_corriente: 0.00,
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
        console.log('Esta es la informacion que voy a mandar en el edit: ', mappedValues)
        console.log('entre en el if de submit')
        await axios.put(`${clientUrl}${id}/`, mappedValues);
      } else if (clientUrl) {
        console.log('entre en el else de submit')
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
  }, [id]);

  useEffect(() => {
    if (province){
      loadCitiesByProvinceId(province)
    }
    }, [province])
    
  useEffect(() => {
    if (city){
      loadDistrictsByCityId(city)
    }
    }, [city])

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
