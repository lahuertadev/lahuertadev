import React, { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CheckList from './list';
import OwnCheckList from '../cheque_propio/list';

const CheckPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          },
        }}
      >
        <Tab label="Cheques recibidos" />
        <Tab label="Cheques emitidos" />
      </Tabs>

      <div className="pt-2">
        {activeTab === 0 && <CheckList />}
        {activeTab === 1 && <OwnCheckList />}
      </div>
    </div>
  );
};

export default CheckPage;
