import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

// Tokens del proyecto
const BG   = '#f0f4f7';
const TEXT = '#2c3437';
const BLUE = '#4a7bc4';
const RED  = '#f87171';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

/**
 * BasicDatePicker — popup de MUI con input estilizado al diseño del proyecto.
 *
 * Props:
 *   label    — label renderizado arriba del campo
 *   name     — name del campo
 *   value    — fecha en formato 'YYYY-MM-DD' o null
 *   onChange — callback con fecha en formato 'YYYY-MM-DD' o null
 *   error    — mensaje de error (string)
 *   hasError — bool para borde rojo (sin mensaje, ej. desde ClientForm)
 *   width    — ancho del campo (default '100%')
 */
export default function BasicDatePicker({ label, name, value, onChange, error, hasError, width }) {
  const handleDateChange = (newValue) => {
    const formatted = newValue ? dayjs.utc(newValue).format('YYYY-MM-DD') : null;
    onChange(formatted);
  };

  const isError = Boolean(error) || Boolean(hasError);

  return (
    <div className="w-full">
      {label && <label className={labelCls}>{label}</label>}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          name={name}
          value={value ? dayjs(value) : null}
          onChange={handleDateChange}
          format="DD/MM/YYYY"
          slotProps={{
            textField: {
              size: 'small',
              error: isError,
              helperText: error || '',
              sx: {
                width: width || '100%',
                '& .MuiInputLabel-root': { display: 'none' },
                '& .MuiInputBase-root': {
                  borderRadius: '8px',
                  backgroundColor: BG,
                  border: isError ? `1px solid ${RED}` : '1px solid transparent',
                  fontSize: '0.875rem',
                  color: TEXT,
                  transition: 'border-color 150ms, box-shadow 150ms',
                  boxShadow: isError ? '0 0 0 2px rgba(248,113,113,0.12)' : 'none',
                  '&:hover': { backgroundColor: BG },
                  '&.Mui-focused': {
                    borderColor: isError ? RED : 'rgba(74,123,196,0.4)',
                    boxShadow: isError
                      ? '0 0 0 2px rgba(248,113,113,0.12)'
                      : '0 0 0 2px rgba(74,123,196,0.10)',
                  },
                },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiInputBase-input': {
                  padding: '8px 12px',
                  color: TEXT,
                  fontSize: '0.875rem',
                },
                '& .MuiInputAdornment-root .MuiIconButton-root': {
                  color: '#596064',
                  '&:hover': { color: BLUE },
                },
                '& .MuiFormHelperText-root': {
                  marginLeft: 0,
                  marginTop: '4px',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                },
              },
            },
          }}
        />
      </LocalizationProvider>
    </div>
  );
}
