import React from 'react'
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

export default function BasicSelect({label, name, onChange, value, options}) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl fullWidth variant="outlined">
        <InputLabel shrink>{label}</InputLabel>
        <Select
          id={name}
          name={name}
          value={value?.value || ''}
          label={label}
          onChange={(e) => {
            const rawValue = e.target.value;
            const selectedOption = options?.find(option => option.value === rawValue);
            const value = selectedOption ?? (rawValue === -1 || rawValue === '-1' ? { name: 'Seleccioná una opción', value: -1 } : { name: '', value: rawValue });
            onChange({ target: { name, value } });
          }}
        >
          <MenuItem value={-1}>Seleccioná una opción</MenuItem>
          {options.map(({ value, name }) => (
            <MenuItem key={value} value={value}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}