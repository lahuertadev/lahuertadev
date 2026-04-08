import React, { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Componentes personalizados
import CustomInput from '../../../components/Input';
import IconLabelButtons from '../../../components/Button';
import { priceListUrl } from '../../../constants/urls';

const PriceListForm = () => {
  const [initialValues, setInitialValues] = useState({
    nombre: '',
    descripcion: '',
  });

  const [itemToEdit, setItemToEdit] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  //* Función para traer la información para editar una lista de precios
  const fetchItemToEdit = async () => {
    try {
      const response = await axios.get(`${priceListUrl}${id}/`);
      const data = response.data;
      
      setInitialValues({
        nombre: data.nombre,
        descripcion: data.descripcion || '',
      });
      setItemToEdit(data);
    } catch (error) {
      console.error('Error al cargar la lista de precios para edición:', error);
    }
  };

  const validationSchema = Yup.object({
    nombre: Yup.string()
      .required('El nombre es obligatorio')
      .max(100, 'El nombre no puede exceder los 100 caracteres'),
    descripcion: Yup.string()
      .max(500, 'La descripción no puede exceder los 500 caracteres'),
  });

  //* Función para mapear los datos al formato del backend
  const mapFormDataToBackend = (values) => {
    return {
      nombre: values.nombre,
      descripcion: values.descripcion || '',
    };
  };

  //* Manejo del envío del formulario
  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    const mappedValues = mapFormDataToBackend(values);
    try {
      if (itemToEdit && id) {
        await axios.put(`${priceListUrl}${id}/`, mappedValues);
        navigate(`/price-list/detail/${id}`);
      } else {
        const response = await axios.post(priceListUrl, mappedValues);
        navigate(`/price-list/detail/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error enviando el formulario:', error);
      if (error.response?.data?.error) {
        setErrors({ nombre: error.response.data.error });
      } else {
        setErrors({ nombre: 'Error al guardar la lista de precios' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  //* Carga de datos si es edición
  useEffect(() => {
    if (id) {
      fetchItemToEdit();
    }
  }, [id]);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, handleChange, isSubmitting }) => (
        <div className="min-h-screen flex items-start justify-center bg-transparent flex-1 pt-8">
          <Form className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800">
                {id ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
              </h2>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b-2 border-black pb-2">
                Información General
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <Field
                  as={CustomInput}
                  label="Nombre de la Lista"
                  name="nombre"
                  required
                  placeholder="Ej: Lista de Precios Mayo 2026"
                  onChange={handleChange}
                />

                <Field
                  as={CustomInput}
                  label="Descripción"
                  name="descripcion"
                  multiline
                  rows={4}
                  placeholder="Descripción opcional de la lista de precios"
                  onChange={handleChange}
                />
              </div>
            </div>

            {id && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="text-sm text-blue-700">
                  <strong>Nota:</strong> Después de guardar los cambios, podrás agregar o editar productos en la vista de edición.
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="mt-8 flex justify-center gap-4">
              <IconLabelButtons
                label="Cancelar"
                variant="outlined"
                color="secondary"
                size="large"
                onClick={() => navigate('/price-list')}
              />
              <IconLabelButtons
                label={isSubmitting ? 'Guardando...' : 'Guardar'}
                variant="contained"
                color="primary"
                size="large"
                type="submit"
                disabled={isSubmitting}
              />
            </div>

            {Object.keys(errors).map((key) =>
              touched[key] && errors[key] ? (
                <div key={key} className="text-red-500 text-sm mt-2 text-center">
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

export default PriceListForm;
