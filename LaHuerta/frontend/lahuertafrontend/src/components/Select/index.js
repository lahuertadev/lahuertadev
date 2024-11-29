import React from 'react'
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

export default function BasicSelect({label, name, onChange, value, options}) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">{label}</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id={name}
          name={name}
          value={value || ''}
          label={label}
          onChange={onChange}
        >
          <MenuItem value={-1}>Seleccioná una opción</MenuItem>
          {options.map(({value, name}) => {
              return (
                <MenuItem 
                  key={value}
                  value={value}>
                  {name}
                </MenuItem>
              )
            }
          )}
        </Select>
      </FormControl>
    </Box>
  );
}

// rfc