import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export default function IconLabelButtons({ label, color, variant, size, onClick, disabled, className, icon}) {
  return (
    <Stack direction="row" spacing={2}>
      <Button 
        className={`bg-blue-lahuerta text-black !font-bold hover:bg-blue-lahuerta hover:text-white  ${className}`}
        variant={variant} 
        color={color}
        size={size}
        endIcon={icon}
        onClick={onClick}
        disabled={disabled}
        type='submit'
        sx={{
          textTransform: 'none',
          color: 'inherit'
        }}>
        {label}
      </Button>
    </Stack>
  );
}