import React, { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import CustomInput from '../../../components/Input';
import BasicSelect from '../../../components/Select';
import IconLabelButtons from '../../../components/Button';
import { loadOptions } from '../../../utils/selectOptions';
import { supplierUrl, marketUrl } from '../../../constants/urls';

const ProveedorForm = () => {
  const [markets, setMarkets] = useState([]);
  const [initialValues, setInitialValues] = useState({
    nombre: '',
    fantasyName: '',
    market: '',
    puesto: '',
    nave: '',
    telefono: '',
  });

  const { id } = useParams();
  const navigate = useNavigate();

  const loadInitialOptions = async () => {
    const marketOptions = await loadOptions(marketUrl, (data) =>
      data.map((item) => ({ name: item.descripcion, value: item.id }))
    );
    setMarkets(marketOptions);
  };

  const fetchItemToEdit = async () => {
    try {
      const response = await axios.get(`${supplierUrl}${id}/`);
      const data = response.data;

      setInitialValues({
        nombre: data.nombre,
        fantasyName: data.nombre_fantasia,
        market: { name: data.mercado.descripcion, value: data.mercado.id },
        puesto: data.puesto,
        nave: data.nave,
        telefono: data.telefono,
      });
    } catch (error) {
      console.error('Error al cargar el proveedor para la edición: ', error);
    }
  };

  const validationSchema = Yup.object({
    nombre: Yup.string().required('El nombre es obligatorio'),
    market: Yup.object().required('El mercado es obligatorio'),
    puesto: Yup.number().required('El puesto es obligatorio').positive().integer(),
    nave: Yup.number().nullable().positive().integer(),
    telefono: Yup.string().required('El teléfono es obligatorio'),
  });

  const mapFormDataToBackend = (values) => ({
    nombre: values.nombre,
    nombre_fantasia: values.fantasyName,
    mercado: values.market.value,
    puesto: values.puesto,
    nave: values.nave,
    telefono: values.telefono,
  });

  const handleSubmit = async (values) => {
    const mappedValues = mapFormDataToBackend(values);
    try {
      if (id) {
        await axios.put(`${supplierUrl}${id}/`, mappedValues);
      } else {
        await axios.post(supplierUrl, mappedValues);
      }
      navigate('/supplier');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
    }
  };

  useEffect(() => {
    const loadFormOptions = async () => {
      await loadInitialOptions();
      if (id) {
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

            {/* Datos del proveedor */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Datos del proveedor</h3>
              <div className="grid grid-cols-3 gap-4">
                <Field
                  as={CustomInput}
                  label="Nombre"
                  name="nombre"
                  required
                  className="col-span-1"
                  onChange={handleChange}
                />
                <Field
                  as={CustomInput}
                  label="Nombre fantasía"
                  name="fantasyName"
                  className="col-span-2"
                  onChange={handleChange}
                />
                <Field
                  as={CustomInput}
                  label="Teléfono"
                  name="telefono"
                  required
                  className="col-span-3"
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">Ubicación</h3>
              <div className="grid grid-cols-3 gap-4">
                <BasicSelect
                  label="Mercado"
                  name="market"
                  value={values.market}
                  options={markets}
                  required
                  className="col-span-3"
                  onChange={handleChange}
                />
                <Field
                  as={CustomInput}
                  label="Puesto"
                  name="puesto"
                  type="number"
                  required
                  className="col-span-1"
                  onChange={handleChange}
                />
                <Field
                  as={CustomInput}
                  label="Nave"
                  name="nave"
                  type="number"
                  className="col-span-1"
                  onChange={handleChange}
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

export default ProveedorForm;
