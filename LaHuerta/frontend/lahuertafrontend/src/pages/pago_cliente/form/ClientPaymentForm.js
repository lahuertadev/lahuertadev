import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import axios from 'axios';
import GenericForm from '../../../components/Form';
import { clientPaymentUrl, clientUrl, paymentTypeUrl } from '../../../constants/urls';
import { useParams } from 'react-router-dom';
import { loadOptions } from '../../../utils/selectOptions';

const ClientPaymentForm = () => {
  const [selectOptions, setSelectOptions] = useState({});
  const [initialValues, setInitialValues] = useState({
    client: '',
    amount: '',
    paymentDate: null,
    paymentType: '',
    observations: '',
  });
  const { id } = useParams();

  const loadInitialOptions = async () => {
    const [clients, paymentTypes] = await Promise.all([
      loadOptions(clientUrl, (data) =>
        data.map((c) => ({ name: `${c.cuit} - ${c.razon_social}`, value: c.id }))
      ),
      loadOptions(paymentTypeUrl, (data) =>
        data.map((t) => ({ name: t.descripcion, value: t.id }))
      ),
    ]);
    setSelectOptions({ client: clients, paymentType: paymentTypes });
  };

  const fetchItemToEdit = async () => {
    if (id) {
      try {
        const response = await axios.get(`${clientPaymentUrl}${id}/`);
        const data = response.data;

        setInitialValues({
          client: { name: `${data.cliente.cuit} - ${data.cliente.razon_social}`, value: data.cliente.id },
          amount: data.importe,
          paymentDate: data.fecha_pago,
          paymentType: { name: data.tipo_pago.descripcion, value: data.tipo_pago.id },
          observations: data.observaciones || '',
        });
      } catch (error) {
        console.error('Error al cargar el pago:', error);
      }
    } else {
      setInitialValues({
        client: '',
        amount: '',
        paymentDate: null,
        paymentType: '',
        observations: '',
      });
    }
  };

  useEffect(() => {
    loadInitialOptions();
    fetchItemToEdit();
  }, [id]);

  const fields = [
    { name: 'client',       label: 'Cliente',         type: 'select', required: true },
    { name: 'amount',       label: 'Importe',          type: 'number', required: true },
    { name: 'paymentDate',  label: 'Fecha de pago',    type: 'date',   required: true },
    { name: 'paymentType',  label: 'Tipo de pago',     type: 'select', required: true },
    { name: 'observations', label: 'Observaciones',    type: 'text',   required: false },
  ];

  const validationSchema = Yup.object().shape({
    client: Yup.mixed()
      .required('Requerido')
      .test('is-valid-option', 'Seleccione un cliente', (value) => value !== null && value !== undefined && value !== ''),
    amount: Yup.number()
      .required('Requerido')
      .positive('El importe debe ser mayor a cero')
      .test(
        'is-decimal',
        'El importe debe tener hasta 2 decimales',
        (value) => /^\d+(\.\d{1,2})?$/.test(value)
      ),
    paymentDate: Yup.date().required('Requerido'),
    paymentType: Yup.mixed()
      .required('Requerido')
      .test('is-valid-option', 'Seleccione un tipo de pago', (value) => value !== null && value !== undefined && value !== ''),
    observations: Yup.string().nullable(),
  });

  const mapFormDataToBackend = (values) => ({
    cliente: values.client.value,
    importe: values.amount,
    fecha_pago: values.paymentDate,
    tipo_pago: values.paymentType.value,
    observaciones: values.observations || null,
  });

  const urls = {
    baseUrl: clientPaymentUrl,
    list: '/client-payment',
  };

  return (
    <GenericForm
      fields={fields}
      initialValues={initialValues}
      validationSchema={validationSchema}
      selectOptions={selectOptions}
      urls={urls}
      mapFormDataToBackend={mapFormDataToBackend}
    />
  );
};

export default ClientPaymentForm;
