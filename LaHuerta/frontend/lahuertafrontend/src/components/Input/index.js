import React, { useState } from 'react';
import { TextField } from '@mui/material';

const CustomInput = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  variant = 'outlined',
  maxLength = 255,
  required = false,
  helperText = '',
  regex,
  regexErrorText = 'Formato inválido',
  width,
  height,
  className = '',
  ...props
}) => {
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const newValue = e.target.value;
  
    if (regex && regex instanceof RegExp) {
      if (!regex.test(newValue)) {
        setError(regexErrorText);
      } else {
        setError(null); 
      }
    } else {
      setError(null);
    }
    onChange(e);
  };

  return (
    <TextField
      id={`${name}-input`}
      label={
        <span>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </span>
      }
      name={name}
      type={type}
      value={value}
      onChange={handleInputChange}
      variant={variant}
      inputProps={{
        maxLength,
      }}
      required={required}
      error={Boolean(error)} 
      helperText={error || helperText} 
      className={`${className}`}
      fullWidth
      InputProps={{
        sx: {
          width: width || 'auto',
          height: height || 'auto',
        },
      }}
      {...props}
    />
  );
};

export default CustomInput;
