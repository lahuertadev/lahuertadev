import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import axios from 'axios';
import GenericForm from '../../../components/Form';
import { marketUrl } from '../../../constants/urls';
import { useParams } from 'react-router-dom';

const MercadoForm = () => {
  const { id } = useParams();

  const [initialValues, setInitialValues] = useState({
    descripcion: '',
  });

  const fetchItemToEdit = async () => {
    if (!id) return;

    try {
      const response = await axios.get(`${marketUrl}${id}/`);
      setInitialValues({
        descripcion: response.data.descripcion,
      });
    } catch (error) {
      console.error('Error loading Mercado:', error);
    }
  };

  useEffect(() => {
    fetchItemToEdit();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mapFormDataToBackend = (values) => ({
    descripcion: values.descripcion,
  });

  const fields = [
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'text',
      required: true,
    },
  ];

  const validationSchema = Yup.object().shape({
    descripcion: Yup.string()
      .max(20, 'Máximo 20 caracteres')
      .required('Requerido'),
  });

  const urls = {
    baseUrl: marketUrl,
    list: '/market',
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

export default MercadoForm;
