const STATE_CONFIG = {
  'EMITIDO': { label: 'Emitido', bg: '#e8f0fb', color: '#4a7bc4' },
  'COBRADO': { label: 'Cobrado', bg: '#dcfce7', color: '#166534' },
  'ANULADO': { label: 'Anulado', bg: '#ffebee', color: '#c62828' },
};

export const formatCompras = (ids) => {
  if (!ids || ids.length === 0) return '—';
  const MAX = 2;
  const formatted = ids.map((id) => `#${String(id).padStart(8, '0')}`);
  if (formatted.length <= MAX) return formatted.join(', ');
  return formatted.slice(0, MAX).join(', ') + '...';
};

export const columns = [
  { field: 'numero',    headerName: 'Número',            flex: 0.6, align: 'center', headerAlign: 'center' },
  { field: 'supplier',  headerName: 'Proveedor',         flex: 1.1, align: 'center', headerAlign: 'center' },
  { field: 'purchases', headerName: 'Compras',           flex: 1.1, align: 'center', headerAlign: 'center',
    renderCell: (params) => <span title={params.row.purchasesRaw?.map((id) => `#${String(id).padStart(8, '0')}`).join(', ')}>{params.value}</span>
  },
  { field: 'bank',      headerName: 'Banco',             flex: 0.9, align: 'center', headerAlign: 'center' },
  { field: 'amount',    headerName: 'Importe',           flex: 0.8, align: 'center', headerAlign: 'center' },
  { field: 'issueDate', headerName: 'Fecha emisión',     flex: 0.9, align: 'center', headerAlign: 'center' },
  { field: 'dueDate',   headerName: 'Fecha vencimiento', flex: 0.9, align: 'center', headerAlign: 'center' },
  {
    field: 'state',
    headerName: 'Estado',
    flex: 0.7,
    minWidth: 115,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const cfg = STATE_CONFIG[params.value] || { label: params.value || '-', bg: '#f0f4f7', color: '#596064' };
      return (
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: '18px',
          backgroundColor: cfg.bg,
          color: cfg.color,
          whiteSpace: 'nowrap',
        }}>
          {cfg.label}
        </span>
      );
    },
  },
];
