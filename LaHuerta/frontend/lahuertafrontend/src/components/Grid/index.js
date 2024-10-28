import * as React from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete'; 
import '../../styles/grids.css' 

export default function DataGridDemo({ rows, columns, onSelectionChange, onDelete, onEdit }) {

  //* Acción de edición
  const editColumn = {
    field: 'edit',
    headerName: 'Editar',
    minWidth: 100, 
    renderCell: (params) => (
      <EditIcon 
        onClick={() => onEdit(params.row.id)} 
        style={{ cursor: 'pointer' }} 
      />
    ),
  };
  
  //* Acción de eliminación
  const deleteColumn = {
    field: 'delete',
    headerName: 'Eliminar',
    minWidth: 100, 
    renderCell: (params) => (
      <DeleteIcon 
        onClick={() => onDelete(params.row.id)} 
        style={{ cursor: 'pointer', color: 'red' }} 
      />
    ),
  };

  // const updatedColumns = [...columns, editColumn, deleteColumn ];

  const updatedColumns = columns.map(column => ({
    ...column,
    minWidth: column.field === 'Tipo de Gasto' ? 200 : 100,
    flex: 1,
  })).concat([editColumn, deleteColumn]);

  return (
    <Box className="custom-container">
      <DataGrid
        rows={rows}
        columns={updatedColumns}
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
        autosizeOptions={{
          columns: updatedColumns
        }}
        style={{ width: '100%' }}
      />
    </Box>
  );
}