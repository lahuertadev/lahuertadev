import * as React from 'react';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
export default function BasicDatePicker({label, name, required, value, onChange, error, width, height}) {

  const handleDateChange = (newValue) => {
    const formattedDate = newValue ? dayjs(newValue).format('YYYY-MM-DD') : null; // Formato ISO para guardar
    onChange(formattedDate); // Envía el valor en formato 'YYYY-MM-DD' al controlador del formulario
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DemoContainer components={['DatePicker']}>
        <DatePicker 
          label={label}
          name= {name}
          required= {required}
          value={value ? dayjs(value) : null} // Setea el formato para la precarga del componente que espera un objeto del tipo dayjs
          onChange={handleDateChange}
          format='DD-MM-YYYY'
          error={Boolean(error)}
          helperText={error || ''}
          sx={{
            width: width || 'auto',  
            height: height || 'auto',
          }}
          
        />
      </DemoContainer>
    </LocalizationProvider>
  );
}