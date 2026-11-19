import React from 'react';
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import DeleteMessage from '../../../components/DeleteMessage';

const iconSx = { fontSize: 16 };

// Qué se borra al eliminar un proveedor: lo que depende de él se elimina en cascada. Lo usan el listado y el detalle.
export const DELETE_SUPPLIER_EFFECTS = [
  { icon: <ContactsOutlinedIcon sx={iconSx} />, text: 'Se eliminan sus contactos.' },
  { icon: <ShoppingCartOutlinedIcon sx={iconSx} />, text: 'Se eliminan sus compras y los pagos que le hiciste.' },
  { icon: <Inventory2OutlinedIcon sx={iconSx} />, text: 'Se eliminan los movimientos de vacíos registrados con él.' },
];

const DeleteSupplierMessage = ({ name, stall }) => (
  <DeleteMessage
    summary={(
      <>
        Vas a eliminar al proveedor <strong>{name}</strong>{stall ? ` (Puesto ${stall})` : ''}. No se puede deshacer.
      </>
    )}
    effects={DELETE_SUPPLIER_EFFECTS}
  />
);

export default DeleteSupplierMessage;
