import React from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/**
 * EmptiesNotice — aviso fijo de que los vacíos no se cargan en la compra:
 * se registran aparte en Proveedores → Vacíos.
 */
const EmptiesNotice = ({ className = '' }) => (
  <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-300 ${className}`}>
    <InfoOutlinedIcon sx={{ fontSize: 18, mt: '1px' }} />
    <p>
      <span className="font-semibold">Los vacíos no se cargan en la compra.</span>{' '}
      Si la factura del proveedor incluye vacíos, registralos aparte en{' '}
      <span className="font-semibold">Proveedores → Vacíos</span>, así quedan reflejados en la cuenta corriente.
    </p>
  </div>
);

export default EmptiesNotice;
