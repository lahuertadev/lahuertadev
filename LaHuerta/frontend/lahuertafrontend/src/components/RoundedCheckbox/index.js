import React from 'react';
import Checkbox from '@mui/material/Checkbox';

const RX = 4;

const IconUnchecked = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="0.75" y="0.75" width="16.5" height="16.5" rx={RX} stroke="#b0b8bc" strokeWidth="1.5" />
  </svg>
);

const IconChecked = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect width="18" height="18" rx={RX} fill="#4a7bc4" />
    <path d="M4 9.5L7.5 13L14 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconIndeterminate = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect width="18" height="18" rx={RX} fill="#4a7bc4" />
    <path d="M5 9H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const RoundedCheckbox = (props) => (
  <Checkbox
    {...props}
    icon={<IconUnchecked />}
    checkedIcon={<IconChecked />}
    indeterminateIcon={<IconIndeterminate />}
    sx={{ borderRadius: '6px', padding: '8px' }}
  />
);

export default RoundedCheckbox;
