import * as React from 'react';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';

export default function CheckboxLabels({name, label, value, onChange}) {
  return (
    <FormGroup>
      <FormControlLabel
        control={
          <Checkbox
            checked={Boolean(value)} 
            onChange={(event) => onChange(name, event.target.checked)}
          />
        }
        label={
          <Typography component="span">
            {label} <span style={{ color: 'red' }}>*</span>
          </Typography>
        }
        labelPlacement="end"
      />
    </FormGroup>
  );
}