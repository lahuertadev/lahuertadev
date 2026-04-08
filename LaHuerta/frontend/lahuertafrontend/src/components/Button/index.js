import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export default function IconLabelButtons({ label, color, variant, size, onClick, disabled, className, icon, type, sx }) {
  return (
    <Stack direction="row" spacing={2}>
      <Button
        className={`
          bg-blue-lahuerta 
          text-white !font-bold 
          hover:bg-blue-lahuerta 
          hover:text-white ${className || ''}`}
        variant={variant || 'contained'}
        size={size}
        endIcon={icon}
        onClick={onClick}
        disabled={disabled}
        type={type || 'button'}
        sx={{
          textTransform: 'none',
          ...sx,
        }}
      >
        {label}
      </Button>
    </Stack>
  );
}