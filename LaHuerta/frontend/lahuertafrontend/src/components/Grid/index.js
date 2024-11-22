import React, { useState } from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete'; 
import '../../styles/grids.css' 

export default function DataGridDemo({ rows, columns, onSelectionChange, onDelete, onEdit }) {
  const [selectedRows, setSelectedRows] = useState([]);

  //* Acción de edición
  const editColumn = {
    field: 'edit',
    headerName: 'Editar',
    minWidth: 100, 
    headerAlign: 'center',
    renderCell: (params) => (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', alignItems: 'center', height: '52px' }}>
        <EditIcon 
          onClick={() => onEdit(params.row.id)} 
          style={{ cursor: 'pointer' }} 
        />
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
        <DeleteIcon 
          onClick={() => onDelete(params.row.id)} 
          style={{ cursor: 'pointer', color: 'red'}} 
        />
      </div>
    ),
  };

  function calculateColumnWidths(rows, columns) {
    return columns.map((column) => {
      const titleLength = column.headerName ? column.headerName.length : 0;
  
      // Encuentra la longitud máxima entre las celdas de la columna
      const maxContentLength = Math.max(
        ...rows.map((row) => (row[column.field] ? row[column.field].toString().length : 0))
      );
  
      // Calcula el ancho basado en el texto más largo entre el título y el contenido
      const maxLength = Math.max(titleLength, maxContentLength);
      const charWidth = 8; // Ancho promedio por carácter
      const padding = 32; // Espaciado adicional
      const calculatedWidth = maxLength * charWidth + padding;
  
      return {
        ...column,
        width: calculatedWidth, // Ancho dinámico calculado
        minWidth: titleLength * charWidth + padding, // Ancho mínimo basado en el título
      };
    });
  }
  
  const adjustedColumns = calculateColumnWidths(rows, columns).concat([editColumn, deleteColumn]);

  
  return (
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
        width: '100%',
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
  );
}