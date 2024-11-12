import React, { useState } from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete'; 
import '../../styles/grids.css' 

export default function DataGridDemo({ rows, columns, onSelectionChange, onDelete, onEdit }) {
  const [selectedIds, setSelectedIds ] = useState([]);

  // const handleSelectionChange = (newSelection) => {
  //   setSelectedIds(newSelection);
  // }

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

  const updatedColumns = columns.map(column => ({
    ...column,
    minWidth: column.field === 'Tipo de Gasto' ? 200 : 100,
    flex: 1, 
    headerClassName: 'custom-header',
    headerAlign: 'center',
  })).concat([editColumn, deleteColumn]);

  return (
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
      disableColumnMenu
      className="custom-grid"
      sx={{
        width: '100%',
        height: '631px',
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
          whiteSpace: 'normal', 
          wordWrap: 'break-word', 
          padding: '4px 0', 
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