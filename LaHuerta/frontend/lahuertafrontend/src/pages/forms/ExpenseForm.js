import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import axios from 'axios';
import GenericForm from '../../components/Form';
import { expenseCreateUrl, expenseUrl } from '../../constants/urls';
import { useLocation, useParams } from 'react-router-dom';

const ExpenseForm = () => {
  const [selectOptions, setSelectOptions] = useState({});
  const [initialValues, setInitialValues] = useState({
    amount: '',
    date: null,
    expenseType: '',
  });
  const { state } = useLocation();
  const { id } = useParams();

  //* Función para cargar opciones de select
  const fetchSelectOptions = async () => {
    try {
      // URLs asociadas a cada campo select
      const fetchConfig = {
        expenseType: 'http://localhost:8000/type_expense/',
      };

      // Carga las opciones de cada URL y las almacena
      const newOptions = {};
      for (const [fieldName, url] of Object.entries(fetchConfig)) {
        const response = await axios.get(url);
        newOptions[fieldName] = response.data.map((item) => ({
          name: item.descripcion,
          value: item.id,
        }));
      }
      setSelectOptions(newOptions);
    } catch (error) {
      console.error('Error loading select options:', error);
    }
  };

  //* Función para traer la información para editar un gasto
  const fetchItemToEdit = async () => {
    if (id) {
      try {
        const response = await axios.get(`${expenseUrl}${id}`);
        const data = response.data;

        setInitialValues({
          amount: data.importe,
          date: data.fecha,
          expenseType: data.tipo_gasto.id,
        });
      } catch (error) {
        console.error('Error loading item to edit:', error);
      }
    } else {
      setInitialValues({
        amount: '',
        date: null,
        expenseType: '',
      });
    }
  };
  useEffect(() => {
    fetchSelectOptions();
    fetchItemToEdit()
  }, [id]);

  //* Función para mapear los datos ingresados con lo que espera el back
  const mapFormDataToBackend = (values) => {
    return {
      fecha: values.date, 
      importe: values.amount,
      tipo_gasto: values.expenseType,
    };
  };

  //* Configuración de los campos del formulario
  const fields = [
    { name: 'amount', label: 'Importe', type: 'number', required: true},
    { name: 'date', label: 'Fecha', type: 'date',required: true},
    { name: 'expenseType', label: 'Tipo de gasto', type: 'select', required: true},
  ];

  //* Esquema de validación con Yup
  const validationSchema = Yup.object().shape({
    amount: Yup.number()
      .required('Requerido')
      .test(
        'is-decimal',
        'El importe debe tener hasta 2 decimales',
        (value) => /^\d+(\.\d{1,2})?$/.test(value)
      ),
    date: Yup.date().required('Requerido'),
    expenseType: Yup.string().required('Requerido'),
  });

  //* URLs para creación y edición
  const urls = {
    baseUrl: expenseUrl,
    list: '/expense/'
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
    />
  );
};

export default ExpenseForm;