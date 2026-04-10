import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export default function IconLabelButtons({ label, color, variant, size, onClick, disabled, className, icon, type, sx }) {
  return (
    <Stack direction="row" spacing={2}>
      <Button
        className={`!font-bold ${className || ''}`}
        variant={variant || 'contained'}
        size={size}
        endIcon={icon}
        onClick={onClick}
        disabled={disabled}
        type={type || 'button'}
        sx={{
          textTransform: 'none',
          backgroundColor: '#4a7bc4',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#3a6ab4',
            boxShadow: '0 4px 12px rgba(74, 123, 196, 0.4)',
          },
          ...sx,
        }}
      >
        {label}
      </Button>
    </Stack>
  );
}