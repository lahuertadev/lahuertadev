import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import '../../styles/grids.css'

export default function DataGridDemo({ rows, columns, onSelectionChange, onDelete, onEdit, onDetail }) {
  const [selectedRows, setSelectedRows] = useState([]);

  //* Acción de detalle (lupa)
  const detailColumn = onDetail
    ? {
        field: 'detail',
        headerName: 'Detalle',
        minWidth: 100,
        headerAlign: 'center',
        renderCell: (params) => (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', alignItems: 'center', height: '52px' }}>
            <Tooltip title="Ver detalle">
              <SearchIcon
                onClick={() => onDetail(params.row.id)}
                style={{ cursor: 'pointer' }}
              />
            </Tooltip>
          </div>
        ),
      }
    : null;

  //* Acción de edición
  const editColumn = {
    field: 'edit',
    headerName: 'Editar',
    minWidth: 100,
    headerAlign: 'center',
    renderCell: (params) => (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', alignItems: 'center', height: '52px' }}>
        <Tooltip title="Editar el registro">
          <EditIcon
            onClick={() => onEdit(params.row.id)}
            style={{ cursor: 'pointer' }}
          />
        </Tooltip>
      </div>
    ),
  };

  //* Acción de eliminación
  const deleteColumn = {
    field: 'delete',
    headerName: 'Eliminar',
    minWidth: 100,
    headerAlign: 'center',
    renderCell: (params) => (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', alignItems: 'center', height: '52px' }}>
        <Tooltip title="Eliminar el registro">
          <DeleteIcon
            onClick={() => onDelete(params.row.id)}
            style={{ cursor: 'pointer', color: 'red' }}
          />
        </Tooltip>
      </div>
    ),
  };

  // Ancho de la columna de checkboxes que agrega DataGrid con checkboxSelection.
  // No la definimos nosotros, por eso no entra en calculateColumnWidths; es un valor fijo razonable.
  const CHECKBOX_COLUMN_WIDTH = 52;

  function calculateColumnWidths(rows, columns) {
    return columns.map((column) => {
      const titleLength = column.headerName ? column.headerName.length : 0;

      const contentLengths = rows.length
        ? rows.map((row) => (row[column.field] != null ? String(row[column.field]).length : 0))
        : [0];
      const maxContentLength = Math.max(titleLength, ...contentLengths);

      const charWidth = 8;
      const padding = 32;
      const calculatedWidth = Math.max(maxContentLength * charWidth + padding, column.minWidth || 80);

      return {
        ...column,
        width: calculatedWidth, // Ancho dinámico calculado
        minWidth: Math.min(calculatedWidth, titleLength * charWidth + padding), // Ancho mínimo basado en el título
      };
    });
  }

  const actionColumns = [detailColumn, editColumn, deleteColumn].filter(Boolean);
  const adjustedColumns = calculateColumnWidths(rows, columns).concat(actionColumns);

  const totalColumnsWidth = adjustedColumns.reduce(
    (sum, col) => sum + (col.width || col.minWidth || 100),
    0
  );
  const totalGridWidth = CHECKBOX_COLUMN_WIDTH + totalColumnsWidth;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Box sx={{ width: totalGridWidth, maxWidth: '100%', minWidth: 280 }}>
        <DataGrid
          rows={rows}
          columns={adjustedColumns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[10]}
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => onSelectionChange(newSelection)}
          disableRowSelectionOnClick
          disableColumnMenu
          className="custom-grid"
          sx={{
            width: totalGridWidth,
            height: '631px',
            overflowX: 'auto',
        '.MuiDataGrid-columnHeader': {
          height: 'auto', 
          minHeight: '56px', 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 8px',
          fontWeight: 'bold',
        },
        '.MuiDataGrid-columnHeaderTitle': {
          fontSize: '16px', 
          fontWeight: 'bold',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          wordWrap: 'break-word', 
          padding: '4px 0', 
          overflow: 'visible',  // Permite que el texto se muestre completamente si cabe
          textOverflow: 'clip', // No trunca el texto con "..."
        },
        '.MuiDataGrid-columnHeaderTitleContainerContent': {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          padding: '4px',
        },
        
        '.MuiDataGrid-cell': {
          textAlign: 'center',
          padding: '10px', 
          display: 'flex',                  
          alignItems: 'center',   
          justifyContent: 'center',  
        },
        
        '.MuiDataGrid-cellContent': {
          wordWrap: 'break-word',
          whiteSpace: 'normal',
        },
      }}
        />
      </Box>
    </Box>
  );
}