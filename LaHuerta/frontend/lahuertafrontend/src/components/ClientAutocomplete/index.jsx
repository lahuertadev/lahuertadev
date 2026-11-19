import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { formatCuit } from '../../utils/cuit';

// Normaliza para buscar sin distinguir mayúsculas ni acentos.
const normalizeText = (text = '') => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Filtra clientes por razón social, nombre de fantasía o CUIT (con o sin guiones).
export const filterClients = (options, { inputValue }) => {
  const term = normalizeText(inputValue).trim();
  if (!term) return options;

  const isCuitSearch = /^[\d\s-]+$/.test(term);
  const cuitDigits = term.replace(/\D/g, '');

  return options.filter((client) =>
    normalizeText(client.razon_social).includes(term)
    || normalizeText(client.nombre_fantasia || '').includes(term)
    || (isCuitSearch && String(client.cuit).includes(cuitDigits))
  );
};

// Mismo alto y colores que los inputs y selects de los formularios, en los dos temas.
const autocompleteSx = (hasError, disabled) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: disabled ? 'var(--color-field-locked)' : 'var(--color-surface-low)',
    borderRadius: '0.5rem',
    minHeight: '2.75rem',
    fontSize: '0.875rem',
    padding: '0 !important',
    '& fieldset': { borderColor: hasError ? '#f87171' : 'var(--color-border-subtle)' },
    '&:hover fieldset': { borderColor: hasError ? '#f87171' : '#4a7bc4' },
    '&.Mui-focused fieldset': { borderColor: '#4a7bc4', borderWidth: '1px' },
  },
  '& .MuiInputBase-input': {
    padding: '0.625rem 0.75rem !important',
    fontSize: '0.875rem',
    color: 'var(--color-on-surface)',
  },
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: 'var(--color-on-surface-muted)',
  },
});

/**
 * ClientAutocomplete — selector de cliente con búsqueda por razón social, nombre de fantasía o CUIT
 * (con o sin guiones). Lo usan Facturación y Pagos de clientes.
 *
 * Props:
 *   clients  — clientes como los devuelve la API ({ id, cuit, razon_social, nombre_fantasia, ... })
 *   value    — el cliente elegido (objeto de `clients`) o null
 *   onChange — (client | null) => void
 *   hasError — marca el campo en rojo
 *   disabled — bloqueado (ej. un pago con el cheque endosado)
 *   required — aria-required para lectores de pantalla (el asterisco va en el label)
 */
export default function ClientAutocomplete({ clients, value, onChange, hasError = false, disabled = false, required = false }) {
  return (
    <Autocomplete
      options={clients}
      value={value}
      onChange={(_, client) => onChange(client)}
      filterOptions={filterClients}
      getOptionLabel={(client) => `${client.cuit} - ${client.razon_social}`}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      noOptionsText="No se encontraron clientes"
      size="small"
      disabled={disabled}
      renderOption={(props, client) => (
        <li {...props} key={client.id}>
          <div className="flex flex-col">
            <span className="text-sm">{client.razon_social}</span>
            <span className="text-xs opacity-70">
              {formatCuit(client.cuit)}{client.nombre_fantasia ? ` · ${client.nombre_fantasia}` : ''}
            </span>
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Buscar por CUIT, razón social o nombre de fantasía..."
          size="small"
          inputProps={{ ...params.inputProps, 'aria-required': required || undefined }}
          sx={autocompleteSx(hasError, disabled)}
        />
      )}
    />
  );
}
