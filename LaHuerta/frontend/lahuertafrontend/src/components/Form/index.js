import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import CustomInput from '../Input';
import DatePicker from '../DatePicker';
import BasicSelect from '../Select';
import Button from '../Button';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/forms.css';
import axios from 'axios';

const GenericForm = ({
  fields,
  initialValues,
  validationSchema,
  selectOptions,
  urls,
  onSubmitCallback,
  mapFormDataToBackend
}) => {
  const [itemToEdit, setItemToEdit] = useState(initialValues || null);
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  //* Manejo del envío del formulario
  const handleSubmit = async (values) => {
    const mappedValues = mapFormDataToBackend(values);
    try {
      if (itemToEdit && id) {
        await axios.put(`${urls.baseUrl}${id}/`, mappedValues);
      } else if (urls.baseUrl) {
        await axios.post(urls.baseUrl, mappedValues);
      }
      if (onSubmitCallback) onSubmitCallback();
      navigate(urls.list);
    } catch (error) {
      console.error('Error enviando el formulario:', error);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ values, setFieldValue, handleChange, errors, touched, isValid, dirty }) => (
        <Form className="custom-form">
          {fields.map((field) => {
            const { name, label, type } = field;

            // Renderizar el componente según el tipo
            switch (type) {
              case 'text':
              case 'number':
              case 'email':
                return (
                  <div key={name} style={{ marginBottom: '16px' }}>
                    <CustomInput
                      name={name}
                      label={label}
                      type={type}
                      value={values[name]}
                      onChange={handleChange}
                      helperText={touched[name] && errors[name]}
                    />
                  </div>
                );
              case 'select':
                return (
                  <div key={name} style={{ marginBottom: '16px' }}>
                    <BasicSelect
                      name={name}
                      label={label}
                      options={selectOptions[name] || []}
                      value={values[name]}
                      handleChange={handleChange}
                      helperText={touched[name] && errors[name]}
                    />
                  </div>
                );
              case 'date':
                return (
                  <div key={name} style={{ marginBottom: '16px' }}>
                    <DatePicker
                      name={name}
                      label={label}
                      value={values[name]}
                      onChange={(date) => setFieldValue(name, date)}
                      helperText={touched[name] && errors[name]}
                    />
                  </div>
                );
              default:
                return null;
            }
          })}
          <div className="custom-button">
            <Button
              label="Enviar"
              color="primary"
              variant="contained"
              size="large"
              type="submit"
              disabled={!isValid || !dirty}
            />
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default GenericForm;