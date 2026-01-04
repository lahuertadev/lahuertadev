import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import axios from 'axios';
import GenericForm from '../../../components/Form';
import { ConditionIvaTypeUrl } from '../../../constants/urls';
import { useParams } from 'react-router-dom';

const ConditionIvaTypeForm = () => {
  const { id } = useParams();

  const [initialValues, setInitialValues] = useState({
    descripcion: '',
  });

  //* Cargar datos para edición
  const fetchItemToEdit = async () => {
    if (!id) return;

    try {
      const response = await axios.get(`${ConditionIvaTypeUrl}${id}`);
      setInitialValues({
        descripcion: response.data.descripcion,
      });
    } catch (error) {
      console.error('Error loading Tipo Condición IVA:', error);
    }
  };

  useEffect(() => {
    fetchItemToEdit();
  }, [id]);

  //* Mapeo al backend
  const mapFormDataToBackend = (values) => ({
    descripcion: values.descripcion,
  });

  //* Campos del formulario
  const fields = [
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'text',
      required: true,
    },
  ];

  //* Validación
  const validationSchema = Yup.object().shape({
    descripcion: Yup.string()
      .max(50, 'Máximo 20 caracteres')
      .required('Requerido'),
  });

  const urls = {
    baseUrl: ConditionIvaTypeUrl,
    list: '/condition-iva-type/',
  };

  return (
    <GenericForm
      fields={fields}
      initialValues={initialValues}
      validationSchema={validationSchema}
      urls={urls}
      mapFormDataToBackend={mapFormDataToBackend}
    />
  );
};

export default ConditionIvaTypeForm;
