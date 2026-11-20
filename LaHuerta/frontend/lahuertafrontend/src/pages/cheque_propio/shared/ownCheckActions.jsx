import React from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import BlockIcon from '@mui/icons-material/Block';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import DeleteMessage from '../../../components/DeleteMessage';
import { formatCurrency } from '../../../utils/currency';
import { getTodayDate } from '../../../utils/date';

// Acciones de estado de un cheque emitido (DEV-150): cuándo se puede cada una y qué explica su
// confirmación. Las usan el listado (íconos de la columna Acción) y el detalle en mobile.

const iconSx = { fontSize: 16 };
const PAYMENTS_KEPT_NOTE = 'Los pagos no se eliminan: el cheque queda en ellos como registro.';

const isIssued = (check) => check.estado === 'EMITIDO';
const hasPayments = (check) => (check.payments || []).length > 0;
// Se compara como texto YYYY-MM-DD con la fecha local (como Depositar en Cheques): con new Date() la fecha
// se leía en UTC y desde las 21 h un cheque con fecha de mañana aparecía como cobrable.
const depositDate = (check) => (check.fecha_deposito ? check.fecha_deposito.slice(0, 10) : null);
const isWaitingDeposit = (check) => Boolean(depositDate(check)) && depositDate(check) > getTodayDate();

// Motivo por el que no se puede cobrar (vacío si se puede).
export const cashDisabledReason = (check) => {
  if (!isIssued(check)) return 'Solo se cobran los cheques emitidos';
  if (!hasPayments(check)) return 'No se puede cobrar un cheque que no está asociado a ningún pago';
  if (isWaitingDeposit(check)) return 'No se puede cobrar antes de la fecha de depósito';
  return '';
};
export const canCash = (check) => !cashDisabledReason(check);
// Ya se puede cobrar y su fecha de depósito llegó: hay que fijarse en el banco si se cobró.
// Sin fecha de depósito no se destaca, porque no hay un día a partir del cual avisar.
export const isCashDue = (check) => canCash(check) && Boolean(depositDate(check));
export const canCancel = isIssued;
// El rechazo del banco se registra desde Emitido o desde Cobrado (si se marcó cobrado antes del rechazo).
export const canReject = (check) => hasPayments(check) && (isIssued(check) || check.estado === 'COBRADO');

export const OWN_CHECK_ACTIONS = {
  cash: { label: 'Cobrar', icon: CheckCircleOutlineIcon, disabledReason: cashDisabledReason },
  reject: { label: 'Rechazado por el banco', icon: HighlightOffIcon, disabledReason: (check) => (
    hasPayments(check) ? 'Solo se rechazan los cheques emitidos o cobrados' : 'El cheque no se usó en ningún pago'
  ) },
  cancel: { label: 'Anular', icon: BlockIcon, disabledReason: 'Solo se anulan los cheques emitidos' },
};

const checkSummary = (check, verb) => (
  <>Vas a {verb} el cheque N° <strong>{check.numero}</strong> de <strong>{formatCurrency(check.importe)}</strong>.</>
);

// Confirmaciones de Anular y Rechazar: título, texto y botón del diálogo.
export const ownCheckConfirmation = (action, check) => {
  if (action === 'cancel') {
    if (!hasPayments(check)) {
      return {
        title: 'Anular cheque',
        confirmLabel: 'Anular',
        message: (
          <DeleteMessage summary={<>{checkSummary(check, 'anular')} Queda como registro y ya no se puede editar ni eliminar.</>} />
        ),
      };
    }
    return {
      title: 'Anular cheque',
      confirmLabel: 'Anular',
      message: (
        <DeleteMessage
          summary={<>{checkSummary(check, 'anular')} Queda como registro y ya no se puede editar ni eliminar.</>}
          effects={[
            { icon: <ReceiptLongOutlinedIcon sx={iconSx} />, text: 'Cada pago pierde lo que se pagó con este cheque.' },
            { icon: <AccountBalanceWalletOutlinedIcon sx={iconSx} />, text: 'La Huerta vuelve a deberle ese importe al proveedor.' },
            { icon: <ShoppingCartOutlinedIcon sx={iconSx} />, text: 'Las compras pagadas vuelven a su estado anterior, empezando por la más nueva.' },
          ]}
          note={PAYMENTS_KEPT_NOTE}
        />
      ),
    };
  }
  return {
    title: 'Registrar el rechazo del cheque',
    confirmLabel: 'Registrar rechazo',
    message: (
      <DeleteMessage
        summary={<>Vas a registrar que el banco rechazó el cheque N° <strong>{check.numero}</strong> de <strong>{formatCurrency(check.importe)}</strong>.</>}
        effects={[
          { icon: <ReceiptLongOutlinedIcon sx={iconSx} />, text: 'Cada pago pierde lo que se pagó con este cheque.' },
          { icon: <ShoppingCartOutlinedIcon sx={iconSx} />, text: 'Esa parte se descuenta de sus compras, empezando por la más nueva: vuelven a Parcial o Pendiente.' },
          { icon: <AccountBalanceWalletOutlinedIcon sx={iconSx} />, text: 'La Huerta vuelve a deberle ese importe al proveedor.' },
        ]}
        note={PAYMENTS_KEPT_NOTE}
      />
    ),
  };
};

export const OWN_CHECK_ACTION_ERROR_VERBS = { cash: 'cobrar', cancel: 'anular', reject: 'rechazar' };

// Mensaje de éxito de cada acción (listado y detalle).
export const OWN_CHECK_ACTION_SUCCESS = {
  cash: 'El cheque se marcó como cobrado.',
  reject: 'Se registró el rechazo del cheque.',
  cancel: 'El cheque se anuló correctamente.',
};
