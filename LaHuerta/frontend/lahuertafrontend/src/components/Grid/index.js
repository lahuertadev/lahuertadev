import React from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RoundedCheckbox from '../RoundedCheckbox';

/**
 * DataGridDemo — grilla reutilizable.
 *
 * Props:
 *   rows              — array de filas (cada fila debe tener `id`)
 *   columns           — definición de columnas MUI DataGrid:
 *                         { field, headerName, flex?, width?, minWidth?, renderCell? }
 *                         Si una columna no tiene `flex` ni `width`, se le calcula
 *                         minWidth en base al header vs. el contenido más largo.
 *   onEdit            — (id) => void
 *   onDelete          — (id) => void
 *   onDetail          — (id) => void  (opcional — omitir para ocultar el botón)
 *   onSelectionChange — (ids[]) => void
 *   multiSelect       — bool (default true) — activa checkboxes y selección múltiple
 *   pageSize          — number (default 10)
 */

// Calcula el minWidth de cada columna comparando el largo del headerName
// contra el contenido más largo. El mayor determina el mínimo.
// Las columnas también reciben flex:1 para expandirse y cubrir el contenedor.
function calculateColumnWidths(rows, columns) {
  return columns.map((column) => {
    // Si la columna ya define flex o width explícito, respetar eso
    if (column.flex != null || column.width != null) return column;

    const titleLength = column.headerName ? column.headerName.length : 0;
    const contentLengths = rows.length
      ? rows.map((row) => (row[column.field] != null ? String(row[column.field]).length : 0))
      : [0];
    const maxContentLength = Math.max(titleLength, ...contentLengths);
    const charWidth = 9;  // 9px/char cubre uppercase + letter-spacing del header
    const padding = 32;
    const minWidth = Math.max(maxContentLength * charWidth + padding, column.minWidth || 80);

    return {
      ...column,
      minWidth,
      flex: minWidth, // peso proporcional: columnas más anchas por contenido obtienen más espacio
    };
  });
}

const actionButtonSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px',
  borderRadius: '8px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: '#596064',
  transition: 'all 0.15s',
};

export default function DataGridDemo({
  rows,
  columns,
  onSelectionChange,
  onDelete,
  onEdit,
  onDetail,
  canDelete,
  canEdit,
  showEdit = true,
  showDelete = true,
  multiSelect = true,
  pageSize = 10,
}) {
  const detailColumn = onDetail
    ? {
        field: 'detail',
        headerName: 'Detalle',
        width: 120,
        sortable: false,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => (
          <Tooltip title="Ver detalle">
            <button
              style={actionButtonSx}
              onMouseEnter={e => { e.currentTarget.style.color = '#4a7bc4'; e.currentTarget.style.background = 'rgba(93,137,200,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#596064'; e.currentTarget.style.background = 'none'; }}
              onClick={() => onDetail(params.row.id)}
            >
              <SearchIcon sx={{ fontSize: 18 }} />
            </button>
          </Tooltip>
        ),
      }
    : null;

  const editColumn = {
    field: 'edit',
    headerName: 'Editar',
    width: 120,
    sortable: false,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => {
      if (canEdit && !canEdit(params.row)) return null;
      return (
        <Tooltip title="Editar">
          <button
            style={actionButtonSx}
            onMouseEnter={e => { e.currentTarget.style.color = '#4a7bc4'; e.currentTarget.style.background = 'rgba(93,137,200,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#596064'; e.currentTarget.style.background = 'none'; }}
            onClick={() => onEdit(params.row.id)}
          >
            <EditIcon sx={{ fontSize: 18 }} />
          </button>
        </Tooltip>
      );
    },
  };

  const deleteColumn = {
    field: 'delete',
    headerName: 'Eliminar',
    width: 120,
    sortable: false,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => {
      if (canDelete && !canDelete(params.row)) return null;
      return (
        <Tooltip title="Eliminar">
          <button
            style={actionButtonSx}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#596064'; e.currentTarget.style.background = 'none'; }}
            onClick={() => onDelete(params.row.id)}
          >
            <DeleteIcon sx={{ fontSize: 18 }} />
          </button>
        </Tooltip>
      );
    },
  };

  const actionColumns = [
    detailColumn,
    showEdit ? editColumn : null,
    showDelete ? deleteColumn : null,
  ].filter(Boolean);
  const adjustedColumns = calculateColumnWidths(rows, columns).concat(actionColumns);

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={adjustedColumns}
        initialState={{
          pagination: { paginationModel: { pageSize } },
        }}
        pageSizeOptions={[10, 25, 50]}
        checkboxSelection={multiSelect}
        onRowSelectionModelChange={(sel) => onSelectionChange?.(sel)}
        disableRowSelectionOnClick
        disableColumnMenu
        autoHeight
        slots={{ baseCheckbox: RoundedCheckbox }}
        sx={{
          width: '100%',
          border: 'none',
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',

          // ── Headers ────────────────────────────────────────────
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'rgba(240,244,247,0.5)',
            borderBottom: '1px solid #e3e9ed',
            borderRadius: 0,
          },
          '& .MuiDataGrid-columnHeader': {
            padding: '0 24px',
            '&:focus, &:focus-within': { outline: 'none' },
          },
          '& .MuiDataGrid-columnHeaderCheckbox': {
            padding: 0,
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#596064',
          },
          '& .MuiDataGrid-columnSeparator': { display: 'none' },

          // ── Filas ──────────────────────────────────────────────
          '& .MuiDataGrid-row': {
            '&:hover': { backgroundColor: '#f0f4f7' },
            '&.Mui-selected': {
              backgroundColor: 'rgba(93,137,200,0.05)',
              '&:hover': { backgroundColor: 'rgba(93,137,200,0.08)' },
            },
          },
          '& .MuiDataGrid-cell': {
            padding: '0 24px',
            color: '#2c3437',
            borderBottom: '1px solid #e3e9ed',
            '&:focus, &:focus-within': { outline: 'none' },
          },

          // ── Checkbox ───────────────────────────────────────────
          '& .MuiCheckbox-root': {
            '&:hover': { backgroundColor: 'rgba(93,137,200,0.06)' },
          },

          // ── Paginación ─────────────────────────────────────────
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #e3e9ed',
            backgroundColor: 'rgba(240,244,247,0.1)',
            minHeight: '52px',
          },
          '& .MuiTablePagination-root': {
            color: '#596064',
            fontSize: '0.6875rem',
          },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.6875rem',
            color: '#596064',
          },
          '& .MuiIconButton-root': {
            color: '#596064',
            '&:hover': { backgroundColor: 'rgba(93,137,200,0.08)' },
            '&.Mui-disabled': { color: '#acb3b7' },
          },
        }}
      />
    </Box>
  );
}
