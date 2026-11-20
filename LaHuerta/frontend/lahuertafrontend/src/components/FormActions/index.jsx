import React from 'react';
import SpotlightButton from '../SpotlightButton';
import BackButton from '../BackButton';

/**
 * Botones Cancelar / Confirmar al pie de los formularios de alta y edición.
 *
 * Props:
 *   onCancel, cancelLabel   — acción y texto del botón secundario
 *   onConfirm, confirmLabel — acción y texto del botón principal
 *   confirmDisabled         — deshabilita Confirmar (formulario incompleto o guardando)
 *   confirmType             — 'button' (default) | 'submit' para formularios Formik que envían con onSubmit
 *   onBack                  — opcional: en mobile agrega Volver abajo de todo, a lo ancho (en desktop va arriba,
 *                             en PageHeader)
 */
const FormActions = ({
  onCancel,
  cancelLabel = 'Cancelar',
  onConfirm,
  confirmLabel = 'Confirmar',
  confirmDisabled = false,
  confirmType = 'button',
  onBack,
}) => (
  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 mt-6 pt-4 border-t border-border-subtle">
    {onBack && (
      <div className="sm:hidden">
        <BackButton onClick={onBack} className="w-full px-6 py-2.5 text-sm" />
      </div>
    )}

    <SpotlightButton variant="cancel" onClick={onCancel} className="w-full sm:w-auto px-6 py-2.5 text-sm">
      {cancelLabel}
    </SpotlightButton>

    <SpotlightButton
      variant="primary"
      type={confirmType}
      onClick={onConfirm}
      disabled={confirmDisabled}
      className="w-full sm:w-auto sm:min-w-[10rem] px-6 py-2.5 text-sm"
      data-tour="form-confirm"
    >
      {confirmLabel}
    </SpotlightButton>
  </div>
);

export default FormActions;
