// Estilo de los buscadores (Autocomplete de MUI): mismo alto y colores que los inputs y selects de los
// formularios, en los dos temas. Lo usan ClientAutocomplete y SupplierAutocomplete.
export const autocompleteSx = (hasError, disabled) => ({
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
