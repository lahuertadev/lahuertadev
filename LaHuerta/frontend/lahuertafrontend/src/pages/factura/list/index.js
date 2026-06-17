import React, { useState, useEffect } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import axios from 'axios';
import { billUrl, billTypeUrl } from '../../../constants/urls';
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
      amount: formatCurrency(bill.total),
      cae: bill.cae,
    }));

const buildTabsData = (facturaOptions, remitoOptions) => [
  {
    label: 'Facturas',
    data: {
      fetchUrl: {
        baseUrl: billUrl,
        createUrl: '/bill/create',
        editUrl: '/bill/edit',
        detailUrl: '/bill/detail',
      },
      columns,
      filtersConfig: [
        { label: 'CUIT',         name: 'cuit',          type: 'text' },
        { label: 'Razón Social', name: 'business_name', type: 'text' },
        { label: 'Tipo',         name: 'bill_type_id',  type: 'select', options: facturaOptions },
        { label: 'Importe mín.', name: 'amount_min',    type: 'number' },
        { label: 'Importe máx.', name: 'amount_max',    type: 'number' },
        { label: 'Fecha desde',  name: 'date_from',     type: 'date' },
        { label: 'Fecha hasta',  name: 'date_to',       type: 'date' },
      ],
      canDelete: (row) => !row.cae,
      canEdit: (row) => !row.cae,
      title: 'Facturas',
      newLabelText: 'Nueva Factura',
      mapData: mapBills((bill) => bill.tipo_factura.codigo_afip !== null),
    },
  },
  {
    label: 'Remitos',
    data: {
      fetchUrl: {
        baseUrl: billUrl,
        createUrl: '/bill/create',
        editUrl: '/bill/edit',
        detailUrl: '/bill/detail',
      },
      columns,
      filtersConfig: [
        { label: 'CUIT',         name: 'cuit',            type: 'text' },
        { label: 'Razón Social', name: 'razon_social',    type: 'text' },
        { label: 'Tipo',         name: 'tipo_factura_id', type: 'select', options: remitoOptions },
        { label: 'Importe mín.', name: 'importe_min',     type: 'number' },
        { label: 'Importe máx.', name: 'importe_max',     type: 'number' },
        { label: 'Fecha desde',  name: 'fecha_desde',     type: 'date' },
        { label: 'Fecha hasta',  name: 'fecha_hasta',     type: 'date' },
      ],
      canDelete: (row) => !row.cae,
      canEdit: (row) => !row.cae,
      title: 'Remitos',
      newLabelText: 'Nuevo Remito',
      mapData: mapBills((bill) => bill.tipo_factura.codigo_afip === null),
    },
  },
];

const BillList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [tabsData, setTabsData] = useState(buildTabsData([], []));

  useEffect(() => {
    axios.get(billTypeUrl).then((res) => {
      const facturaOptions = res.data
        .filter((t) => t.codigo_afip !== null)
        .map((t) => ({ name: t.descripcion, value: t.id }));
      const remitoOptions = res.data
        .filter((t) => t.codigo_afip === null)
        .map((t) => ({ name: t.descripcion, value: t.id }));
      setTabsData(buildTabsData(facturaOptions, remitoOptions));
    }).catch(() => {});
  }, []);

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
