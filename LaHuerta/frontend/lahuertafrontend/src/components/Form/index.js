import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import CustomInput from '../Input';
import DatePicker from '../DatePicker';
import BasicSelect from '../Select';
import Button from '../Button';
import CheckboxLabels from '../Checkbox';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/forms.css';
import { Grid } from '@mui/material';
import axios from 'axios';

const GenericForm = ({
  fields,
  initialValues,
  validationSchema,
  selectOptions,
  urls,
  onSubmitCallback,
  mapFormDataToBackend,
  columns = 1
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

  const getFormWidth = () => {
    switch (columns) {
      case 1:
        return '20%'; // 1 columna ocupa el 20% del ancho de la pantalla
      case 2:
        return '40%'; // 2 columnas, ocupa el 40%
      case 3:
        return '60%'; // 3 columnas, ocupa el 60%
      case 4:
        return '80%'; // 4 columnas, ocupa el 80%
      default:
        return '20%'; // por defecto, 1 columna (20%)
    }
  };

  // Determina el valor de xs, sm, md para Grid items basado en la cantidad de columnas
  const getColumnSize = () => {
    switch (columns) {
      case 1:
        return 12; // Una columna ocupa toda la pantalla
      case 2:
        return 6; // Dos columnas, cada una ocupa la mitad
      case 3:
        return 4; // Tres columnas, cada una ocupa un tercio
      case 4:
        return 3; // Cuatro columnas, cada una ocupa un cuarto
      default:
        return 12; // Valor por defecto
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, handleChange, errors, touched, isValid, dirty }) => {
          return (
          <Form
            className="custom-form"
            style={{
              width: getFormWidth(), 
              maxWidth: '100%', 
              margin: '0 auto', 
            }}
          >
            <Grid container spacing={3} justifyContent="center" sx={{ width: '100%' }}>
              {fields.map((field) => {
                const { name, label, type, validation } = field;
                return (
                  <Grid item xs={12} sm={getColumnSize()} md={getColumnSize()} key={name}>
                    {/* Renderizar el componente según el tipo */}
                    {type === 'text' || type === 'number' || type === 'email' ? (
                      <CustomInput
                        name={name}
                        label={label}
                        type={type}
                        value={values[name]}
                        onChange={handleChange}
                        helperText={touched[name] && errors[name]}
                        regex={validation?.regex}
                        regexErrorText={validation?.errorMessage}
                      />
                    ) : type === 'select' ? (
                      <BasicSelect
                        name={name}
                        label={label}
                        options={selectOptions[name] || []}
                        value={values[name]}
                        onChange={(e) => {
                          handleChange(e);
                          if (field.onChange) field.onChange(e);
                        }}
                        helperText={touched[name] && errors[name]}
                      />
                    ) : type === 'date' ? (
                      <DatePicker
                        name={name}
                        label={label}
                        value={values[name]}
                        onChange={(date) => setFieldValue(name, date)}
                        helperText={touched[name] && errors[name]}
                      />
                    ) : type === 'checkbox' ? (
                      <CheckboxLabels
                        label={label}
                        name={name}
                        value={values[name]} 
                        onChange={setFieldValue}
                      />
                    ) : null}
                  </Grid>
                );
              })}
            </Grid>
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
          );
        }}
      </Formik>
    </div>
  );
};

export default GenericForm;