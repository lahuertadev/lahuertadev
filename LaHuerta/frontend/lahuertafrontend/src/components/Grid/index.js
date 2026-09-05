import React from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid } from '@mui/x-data-grid';
import useMediaQuery from '@mui/material/useMediaQuery';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
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
 *   pageSizeOptions   — number[] (default [10, 25, 50]) — opciones del selector "Rows per page"
 *   getRowClassName   — (params) => string — para resaltar filas (ej. devolver 'row-highlighted'
 *                         cuando la fila tiene cambios sin guardar)
 */

// Calcula el minWidth de cada columna comparando el largo del headerName
// contra el contenido más largo. El mayor determina el mínimo.
// Se aplica a todas las columnas sin ancho fijo (width), tanto si tienen flex
// explícito como si no, para evitar que se achiquen por debajo del texto.
function calculateColumnWidths(rows, columns, isMobile = false) {
  const contentCharWidth = isMobile ? 7 : 9;
  const headerCharWidth = 9; // headers siempre en uppercase con letter-spacing
  const padding = isMobile ? 8 : 24;

  return columns.map((column) => {
    // Columnas con ancho fijo: no tocar
    if (column.width != null) return column;

    const titleLength = column.headerName ? column.headerName.length : 0;
    const contentLengths = rows.length
      ? rows.map((row) => (row[column.field] != null ? String(row[column.field]).length : 0))
      : [0];
    const maxContentLength = Math.max(...contentLengths);
    const minWidthFloor = column.minWidth || (isMobile ? 60 : 80);
    const minWidth = Math.max(
      titleLength * headerCharWidth + padding,
      maxContentLength * contentCharWidth + padding,
      minWidthFloor
    );

    if (column.flex != null) {
      return { ...column, minWidth };
    }

    return { ...column, minWidth, flex: isMobile ? 1 : minWidth };
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
  color: 'var(--color-on-surface-muted)',
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
  isRowSelectable,
  showEdit = true,
  showDelete = true,
  multiSelect = true,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  getRowClassName,
}) {
  const isMobile = useMediaQuery('(max-width:600px)');
  const columnVisibilityModel = {};
  const actionColWidth = isMobile ? 48 : 120;

  const detailColumn = onDetail
    ? {
        field: 'detail',
        headerName: 'Detalle',
        width: actionColWidth,
        sortable: false,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => (
          <Tooltip title="Ver detalle">
            <button
              style={actionButtonSx}
              onMouseEnter={e => { e.currentTarget.style.color = '#4a7bc4'; e.currentTarget.style.background = 'rgba(93,137,200,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-on-surface-muted)'; e.currentTarget.style.background = 'none'; }}
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
    width: actionColWidth,
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
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-on-surface-muted)'; e.currentTarget.style.background = 'none'; }}
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
    width: actionColWidth,
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
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-on-surface-muted)'; e.currentTarget.style.background = 'none'; }}
            onClick={() => onDelete(params.row.id)}
          >
            <DeleteIcon sx={{ fontSize: 18 }} />
          </button>
        </Tooltip>
      );
    },
  };

  const processedColumns = isMobile
    ? columns
        .filter(col => !col.hiddenOnMobile)
        .map(col => {
          const base = col.mobileHeaderName
            ? { ...col, headerName: col.mobileHeaderName, sortable: false }
            : { ...col, sortable: false };
          return { ...base, flex: 1, minWidth: undefined };
        })
    : columns;

  const actionColumns = isMobile ? [] : [
    detailColumn,
    showEdit ? editColumn : null,
    showDelete ? deleteColumn : null,
  ].filter(Boolean);
  const adjustedColumns = calculateColumnWidths(rows, processedColumns, isMobile).concat(actionColumns);

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={adjustedColumns}
        initialState={{
          pagination: { paginationModel: { pageSize } },
        }}
        pageSizeOptions={pageSizeOptions}
        columnVisibilityModel={columnVisibilityModel}
        checkboxSelection={multiSelect && !isMobile}
        isRowSelectable={isRowSelectable ? (params) => isRowSelectable(params.row) : undefined}
        onRowSelectionModelChange={(sel) => onSelectionChange?.(sel)}
        onRowClick={isMobile && onDetail ? (params) => onDetail(params.row.id) : undefined}
        getRowClassName={getRowClassName}
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
          // El !important es necesario: MUI-X DataGrid pinta el fondo del header con una
          // capa interna propia (ligada a theme.palette.background.paper) por encima del
          // background-color que le pasamos acá, "lavando" nuestro color si no se fuerza.
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'var(--color-surface-low) !important',
            borderBottom: '1px solid var(--color-border-subtle)',
            borderRadius: 0,
          },
          '& .MuiDataGrid-columnHeader': {
            backgroundColor: 'var(--color-surface-low) !important',
            padding: '0 12px',
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
            color: 'var(--color-on-surface-muted)',
          },
          '& .MuiDataGrid-columnSeparator': { display: 'none' },

          // ── Filas ──────────────────────────────────────────────
          '& .MuiDataGrid-row': {
            cursor: isMobile && onDetail ? 'pointer' : 'default',
            '&:hover': { backgroundColor: 'var(--color-surface-low)' },
            '&.Mui-selected': {
              backgroundColor: 'rgba(93,137,200,0.05)',
              '&:hover': { backgroundColor: 'rgba(93,137,200,0.08)' },
            },
          },
          // Fila resaltada (ej. con cambios sin guardar) — pasar 'row-highlighted' vía getRowClassName.
          // Usa --color-row-highlight-rgb, que define un tono más oscuro en claro y uno más
          // claro en oscuro (ver index.css), para que el contraste se note en ambos temas.
          '& .MuiDataGrid-row.row-highlighted': {
            backgroundColor: 'rgb(var(--color-row-highlight-rgb) / 0.16)',
            '&:hover': { backgroundColor: 'rgb(var(--color-row-highlight-rgb) / 0.26)' },
          },
          // Fila de usuario pendiente de aprobación — pasar 'row-pending-approval' vía getRowClassName.
          // Mismo nivel de opacidad que row-highlighted (0.16/0.26) más un borde
          // izquierdo sólido, para que se distinga también en el tema claro.
          '& .MuiDataGrid-row.row-pending-approval': {
            backgroundColor: 'rgb(var(--color-row-pending-rgb) / 0.16)',
            borderLeft: '3px solid var(--color-row-pending)',
            '&:hover': { backgroundColor: 'rgb(var(--color-row-pending-rgb) / 0.26)' },
          },
          '& .MuiDataGrid-cell': {
            padding: '0 12px',
            color: 'var(--color-on-surface)',
            borderBottom: '1px solid var(--color-border-subtle)',
            '&:focus, &:focus-within': { outline: 'none' },
          },
          '& .MuiDataGrid-cell--textCenter': {
            justifyContent: 'center !important',
          },
          '& .MuiDataGrid-cell--textCenter .MuiDataGrid-cellContent': {
            textAlign: 'center',
            width: '100%',
          },

          // ── Checkbox ───────────────────────────────────────────
          '& .MuiCheckbox-root': {
            '&:hover': { backgroundColor: 'rgba(93,137,200,0.06)' },
          },

          // ── Paginación ─────────────────────────────────────────
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-surface-low)',
            minHeight: '52px',
          },
          '& .MuiTablePagination-root': {
            color: 'var(--color-on-surface-muted)',
            fontSize: '0.6875rem',
          },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.6875rem',
            color: 'var(--color-on-surface-muted)',
          },
          '& .MuiIconButton-root': {
            color: 'var(--color-on-surface-muted)',
            '&:hover': { backgroundColor: 'rgba(93,137,200,0.08)' },
            '&.Mui-disabled': { color: 'var(--color-border-subtle)' },
          },
        }}
      />
    </Box>
  );
}
