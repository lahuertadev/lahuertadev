import React, { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { billUrl } from '../../../constants/urls';
import { columns } from '../../../constants/grid/Factura';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapBills = (filterFn) => (data) =>
  data
    .filter(filterFn)
    .map((bill) => ({
      id: bill.id,
      number: `${bill.tipo_factura.abreviatura}${String(bill.numero_comprobante || bill.id).padStart(8, '0')}`,
      date: formatDate(bill.fecha),
      client: bill.cliente.razon_social,
      billType: bill.tipo_factura.descripcion,
      amount: formatCurrency(bill.importe),
      cae: bill.cae,
    }));

const baseConfig = {
  fetchUrl: {
    baseUrl: billUrl,
    createUrl: '/bill/create',
    editUrl: '/bill/edit',
    detailUrl: '/bill/detail',
  },
  columns,
  filtersConfig: [
    { label: 'CUIT',         name: 'cuit',         type: 'text' },
    { label: 'Razón Social', name: 'razon_social',  type: 'text' },
    { label: 'Importe mín.', name: 'importe_min',   type: 'number' },
    { label: 'Importe máx.', name: 'importe_max',   type: 'number' },
    { label: 'Fecha desde',  name: 'fecha_desde',   type: 'date' },
    { label: 'Fecha hasta',  name: 'fecha_hasta',   type: 'date' },
  ],
  canDelete: (row) => !row.cae,
  canEdit: (row) => !row.cae,
};

const tabsData = [
  {
    label: 'Facturas',
    data: {
      ...baseConfig,
      title: 'Facturas',
      newLabelText: 'Nueva Factura',
      mapData: mapBills((bill) => bill.tipo_factura.codigo_afip !== null),
    },
  },
  {
    label: 'Remitos',
    data: {
      ...baseConfig,
      title: 'Remitos',
      newLabelText: 'Nuevo Remito',
      mapData: mapBills((bill) => bill.tipo_factura.codigo_afip === null),
    },
  },
];

const BillList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const current = tabsData[activeTab];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
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
        {tabsData.map((tab, i) => (
          <Tab key={i} label={tab.label} />
        ))}
      </Tabs>

      <GenericList
        key={activeTab}
        data={current.data}
        onAdd={() => navigate('/bill/create')}
      />
    </div>
  );
};

export default BillList;
