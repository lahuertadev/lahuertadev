import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import Modal from '@mui/material/Modal';
import Slider from '@mui/material/Slider';
import Button from '../Button';

const CROPPER_HEIGHT = 280;
const MAX_AVATAR_SIZE = 512;

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImageBlob = async (imageSrc, cropPixels) => {
  const image = await createImage(imageSrc);
  const outputSize = Math.min(cropPixels.width, cropPixels.height, MAX_AVATAR_SIZE);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
};

/**
 * AvatarCropModal — recorte cuadrado de imagen (estilo GitHub/LinkedIn) antes de subir el avatar.
 *
 * Props:
 *   open      — bool
 *   imageSrc  — data URL de la imagen seleccionada
 *   onClose   — () => void
 *   onConfirm — (blob: Blob) => void, recibe la imagen ya recortada en JPEG
 */
const AvatarCropModal = ({ open, imageSrc, onClose, onConfirm }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixelsValue) => {
    setCroppedAreaPixels(croppedAreaPixelsValue);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !imageSrc) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h3 className="text-base font-semibold text-on-surface">Ajustar foto de perfil</h3>

          <div className="relative w-full bg-surface-low rounded-lg overflow-hidden" style={{ height: CROPPER_HEIGHT }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.01}
            onChange={(_, value) => setZoom(value)}
            aria-label="Zoom"
            sx={{ color: '#4a7bc4' }}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-on-surface-muted border border-border-subtle rounded-lg hover:border-red-400 hover:text-red-500 hover:bg-red-50 hover:font-bold transition-colors"
            >
              Cancelar
            </button>
            <Button
              type="button"
              label={saving ? 'Guardando...' : 'Confirmar'}
              color="primary"
              variant="contained"
              onClick={handleConfirm}
              disabled={saving || !croppedAreaPixels}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AvatarCropModal;
