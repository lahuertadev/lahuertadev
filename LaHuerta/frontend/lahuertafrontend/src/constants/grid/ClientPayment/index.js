import React from 'react';
import AlertIcon from '../../../components/AlertIcon';
import Badge from '../../../components/Badge';
import { BADGE_COLORS } from '../../badgeColors';

const PAYMENT_TYPE_CONFIG = {
  'Efectivo':      { ...BADGE_COLORS.green },
  'Transferencia': { ...BADGE_COLORS.indigo },
  'Cheque':        { ...BADGE_COLORS.blue },
  'Débito':        { ...BADGE_COLORS.yellow },
  'Crédito':       { ...BADGE_COLORS.pink },
  'Mercado Pago':  { ...BADGE_COLORS.orange },
  'Cuenta Corr.':  { ...BADGE_COLORS.gray },
  'Pagaré':        { ...BADGE_COLORS.teal },
  'Cheque Propio': { ...BADGE_COLORS.violet },
};

export const columns = [
  { field: 'date',    headerName: 'Fecha',   flex: 1, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
  { field: 'client',  headerName: 'Cliente', flex: 2, align: 'center', headerAlign: 'center', mobileClickable: true },
  { field: 'amount',  headerName: 'Importe', flex: 1, align: 'center', headerAlign: 'center' },
  {
    field: 'paymentType',
    headerName: 'Tipo de pago',
    flex: 1,
    align: 'center',
    headerAlign: 'center',
    hiddenOnMobile: true,
    renderCell: (params) => {
      const cfg = PAYMENT_TYPE_CONFIG[params.value];
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {/* El aviso del cheque rechazado va adentro de la etiqueta, a la derecha: así todas quedan centradas igual. */}
          <Badge color={cfg} label={params.value}>
            {params.row.chequeRechazado && (
              <AlertIcon title="El cheque de este pago fue rechazado. La cuenta corriente del cliente ya fue revertida." size={15} />
            )}
          </Badge>
        </div>
      );
    },
  },
  { field: 'observations', headerName: 'Observaciones', flex: 2, align: 'center', headerAlign: 'center', hiddenOnMobile: true },
];
