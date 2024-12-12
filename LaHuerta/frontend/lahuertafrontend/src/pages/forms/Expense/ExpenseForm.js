import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import axios from 'axios';
import GenericForm from '../../../components/Form';
import { expenseUrl } from '../../../constants/urls';
import { useLocation, useParams } from 'react-router-dom';
import { loadOptions } from '../../../utils/selectOptions';
import { expenseTypeUrl } from '../../../constants/urls';

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
  const loadInitialOptions = async () => {

    const expenseType = await loadOptions(expenseTypeUrl, (data) =>
      data.map((item) => ({ name : item.descripcion, value: item.id}))
    );
    setSelectOptions({ expenseType });
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
          expenseType: { name: data.tipo_gasto.descripcion, value: data.tipo_gasto.id },
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
    loadInitialOptions()
    fetchItemToEdit()
  }, [id]);

  //* Función para mapear los datos ingresados con lo que espera el back
  const mapFormDataToBackend = (values) => {
    return {
      fecha: values.date, 
      importe: values.amount,
      tipo_gasto: values.expenseType.value,
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
    expenseType: Yup.mixed()
      .required('Requerido')
      .test(
        'is-valid-option',
        'Seleccione una opción válida',
        (value) => value !== null && value !== undefined && value !== ''
      ),
  });

  //* URLs para creación y edición
  const urls = {
    baseUrl: expenseUrl,
    list: '/expense/'
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
    />
  );
};

export default ExpenseForm;