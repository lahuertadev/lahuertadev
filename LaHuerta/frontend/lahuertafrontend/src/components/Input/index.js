import React from 'react';
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
  error = null,        
  ...props             
}) => {
  return (
    <TextField
      id={`${name}-input`}
      label={label}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      variant={variant}  // 'outlined', 'filled', 'standard'
      inputProps={{ maxLength }} 
      required={required}        
      error={error || helperText}     
      helperText={error || helperText} 
      fullWidth                 
      {...props}                 
    />
  );
};

export default CustomInput;