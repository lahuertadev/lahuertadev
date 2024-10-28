import * as React from 'react';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import Stack from '@mui/material/Stack';

export default function IconLabelButtons({ label, color, variant, size, onClick, disabled, className}) {
  return (
    <Stack direction="row" spacing={2}>
      <Button 
        className={className}
        variant={variant} 
        color={color}
        size={size}
        endIcon={<SendIcon />}
        onClick={onClick}
        disabled={disabled}
        type='submit'>
        {label}
      </Button>
    </Stack>
  );
}