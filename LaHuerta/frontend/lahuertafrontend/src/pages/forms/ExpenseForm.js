import React, { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import BasicSelect from '../../components/Select';
import CustomInput from '../../components/Input';
import DatePicker from '../../components/DatePicker';
import Button from '../../components/Button';
import { TextField } from '@mui/material';
import '../../styles/forms.css'
import { useParams, useNavigate } from 'react-router-dom'; // UseParams para obtener el id de la URL

const ExpenseForm = () => {
  const [expenseOptions, setExpenseOptions] = useState([]);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [loading, setLoading] = useState(false); //* Controla la carga
  const { id } = useParams(); //* Obtiene el id de la URL. 
  const navigate = useNavigate(); //* Para redirigir después de guardar

  //* Carga los tipos de gasto
  useEffect(() => {
    axios.get('http://localhost:8000/type_expense/')
      .then(response => {
        const formattedOptions = response.data.map(item => ({
          name: item.descripcion,
          value: item.id
        }));
        setExpenseOptions(formattedOptions);
      })
      .catch(error => console.error('Error loading expense types:', error));
  }, []);

  //* Obtiene la información del gasto (en caso de ser edición)
  useEffect(() => {
    if (id){
      setLoading(true);
      axios.get(`http://localhost:8000/expense/${id}`).then(response => {
        setExpenseToEdit(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error al cargar el gasto: ', error);
        setLoading(false);
      });
    }
  }, [id]);

  //* Validaciones con Yup
  const validationSchema = Yup.object().shape({
    amount: Yup.number().required('Requerido')
      .test(
        'is-decimal',
        'El importe debe tener hasta 2 decimales',
        value => /^\d+(\.\d{1,2})?$/.test(value) // Validación de hasta dos decimales
      ),
    expenseType: Yup.string().required('Requerido'),
    date: Yup.date().required('Requerido')
  });


  //* Envío del formulario (edición y creación)
  const handleSubmit = (values) => {
    console.log('Fecha seleccionada:', values.date);
    // Formateo de fecha
    const formattedDate = values.date instanceof Date 
    ? values.date.toISOString().split('T')[0]
    : values.date;

    // Mapeo
    const formattedValues = {
      fecha: formattedDate,         
      importe: values.amount,    
      tipo_gasto: values.expenseType 
    };

    if (expenseToEdit){
      axios.put(`http://localhost:8000/expense/${expenseToEdit.id}/modify/`, formattedValues)
        .then(response => {
          console.log('Gasto editado correctamente: ', response.data);
          navigate('/expense/'); // Redirigir a la lista después de editar
        })
        .catch(error => {
          console.error('Error al editar el formulario:', error);
        });
    } else{
      axios.post('http://localhost:8000/expense/create/', formattedValues)
      .then(response => {
        console.log('Gasto creado exitosamente:', response.data);
        navigate('/expense/');
      })
      .catch(error => {
        console.error('Error al enviar el formulario:', error);
      });
    }
  };

  if (loading){
    return <div>Cargando...</div>
  }
  return (
    <Formik
      initialValues={{ 
        expenseType: expenseToEdit ? expenseToEdit.tipo_gasto.id : '',
        amount: expenseToEdit ? expenseToEdit.importe : '',
        date: expenseToEdit ? expenseToEdit.fecha : null
      }}
      validationSchema={validationSchema}
      enableReinitialize={true} // Reinicia el formulario cuando expenseToEdit cambia.
      onSubmit={handleSubmit}
    >
      {({ values, handleChange, errors, touched, setFieldValue, isValid, dirty }) => (
        <Form className="custom-form">
          <CustomInput
            label= 'Importe'
            name= 'amount'
            type='number'
            required
            onChange={handleChange}
            value={values.amount}
            helperText={touched.amount && errors.amount ? errors.amount : ''}
          />
          <br></br>
          <br></br>

          <DatePicker
            label='Fecha'
            value={values.date}
            onChange={(value) => setFieldValue('date', value)} // Usa setFieldValue para cambiar el valor
            renderInput={(params) => (
              <TextField
                {...params}
                name="date"
                required
                error={Boolean(touched.date && errors.date)}
                helperText={touched.date && errors.date ? errors.date : ''}
              />
            )}
          />

          <br></br>
          <br></br>

          <BasicSelect
            label="Tipo de Gasto"
            name="expenseType"
            handleChange={(e) => {
              handleChange(e);
              setFieldValue('expenseType', e.target.value);
            }}
            value={values.expenseType}
            options={expenseOptions}
          />
          {touched.expenseType && errors.expenseType ? (
            <div className="error">{errors.expenseType}</div>
          ) : null}

          <br></br>
          <br></br>

          <div className= 'custom-button'>
            <Button
              label='Enviar'
              color='primary'
              variant='contained'
              size='large' 
              disabled={!isValid || !dirty} // Verifica si se lleno el formulario correctamente.
            />
          </div>
          
        </Form>
      )}
    </Formik>
  );
};

export default ExpenseForm;