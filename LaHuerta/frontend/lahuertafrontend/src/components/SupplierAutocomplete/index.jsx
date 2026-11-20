import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { normalizeText } from '../../utils/text';
import { formatSupplierLabel } from '../../utils/supplier';
import { autocompleteSx } from '../ClientAutocomplete/autocompleteSx';

/**
 * Filtra proveedores por nombre (sin distinguir mayúsculas ni acentos) o por puesto. Un número busca
 * también los puestos que empiezan con él, como el filtro Proveedor de los listados.
 */
export const filterSuppliers = (options, { inputValue }) => {
  const term = normalizeText(inputValue).trim();
  if (!term) return options;

  const isStallSearch = /^\d+$/.test(term);
  return options.filter((supplier) =>
    normalizeText(supplier.nombre).includes(term)
    || (isStallSearch && String(supplier.puesto ?? '').startsWith(term))
  );
};

/**
 * SupplierAutocomplete — selector de proveedor con búsqueda por nombre o puesto, como el de clientes
 * (ClientAutocomplete). Lo usan Compras (simple y por lote), Pagos de Compras y Vacíos.
 *
 * Props:
 *   suppliers — proveedores como los devuelve la API ({ id, nombre, puesto, mercado, ... })
 *   value     — el proveedor elegido (objeto de `suppliers`) o null
 *   onChange  — (supplier | null) => void
 *   hasError  — marca el campo en rojo
 *   disabled  — bloqueado
 *   required  — aria-required para lectores de pantalla (el asterisco va en el label)
 *   id        — id del input, para el htmlFor del label
 */
export default function SupplierAutocomplete({ suppliers, value, onChange, hasError = false, disabled = false, required = false, id }) {
  return (
    <Autocomplete
      id={id}
      options={suppliers}
      value={value}
      onChange={(_, supplier) => onChange(supplier)}
      filterOptions={filterSuppliers}
      getOptionLabel={formatSupplierLabel}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      noOptionsText="No se encontraron proveedores"
      size="small"
      disabled={disabled}
      renderOption={(props, supplier) => (
        <li {...props} key={supplier.id}>
          <div className="flex flex-col">
            <span className="text-sm">{supplier.nombre}</span>
            <span className="text-xs opacity-70">
              Puesto {supplier.puesto}{supplier.mercado?.descripcion ? ` · ${supplier.mercado.descripcion}` : ''}
            </span>
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Buscar por nombre o puesto..."
          size="small"
          inputProps={{ ...params.inputProps, 'aria-required': required || undefined }}
          sx={autocompleteSx(hasError, disabled)}
        />
      )}
    />
  );
}
