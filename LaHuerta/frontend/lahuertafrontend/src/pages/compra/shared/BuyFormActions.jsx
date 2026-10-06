import React from 'react';
import SpotlightButton from '../../../components/SpotlightButton';

/**
 * Botones Cancelar / Confirmar de los formularios de compra (carga simple y masiva).
 *
 * Props:
 *   onCancel, cancelLabel   — acción y texto del botón secundario
 *   onConfirm, confirmLabel — acción y texto del botón principal
 *   confirmDisabled         — deshabilita Confirmar (formulario incompleto o guardando)
 */
const BuyFormActions = ({ onCancel, cancelLabel = 'Cancelar', onConfirm, confirmLabel = 'Confirmar', confirmDisabled = false }) => (
  <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-3 sm:gap-4 mt-6 pt-4 border-t border-border-subtle">
    <SpotlightButton variant="cancel" onClick={onCancel} className="w-full sm:w-auto px-6 py-2.5 text-sm">
      {cancelLabel}
    </SpotlightButton>

    <SpotlightButton
      variant="primary"
      onClick={onConfirm}
      disabled={confirmDisabled}
      className="w-full sm:w-auto sm:min-w-[10rem] px-6 py-2.5 text-sm"
    >
      {confirmLabel}
    </SpotlightButton>
  </div>
);

export default BuyFormActions;
