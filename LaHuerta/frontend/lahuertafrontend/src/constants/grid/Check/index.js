const STATE_CONFIG = {
  'EN_CARTERA': { label: 'En cartera', bg: '#e8f0fb', color: '#4a7bc4' },
  'DEPOSITADO': { label: 'Depositado', bg: '#fef9c3', color: '#a16207' },
  'ACREDITADO': { label: 'Acreditado', bg: '#dcfce7', color: '#166534' },
  'ENDOSADO':   { label: 'Endosado',   bg: '#f3e8ff', color: '#7e22ce' },
  'RECHAZADO':  { label: 'Rechazado',  bg: '#ffebee', color: '#c62828' },
};

export const columns = [
  { field: 'numero',      headerName: 'Número' },
  { field: 'bank',        headerName: 'Banco' },
  { field: 'amount',      headerName: 'Importe' },
  { field: 'issueDate',   headerName: 'Fecha emisión',  minWidth: 140 },
  { field: 'depositDate', headerName: 'Fecha depósito', minWidth: 145 },
  {
    field: 'state',
    headerName: 'Estado',
    minWidth: 130,
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
  { field: 'endorsed', headerName: 'Endosado' },
];
