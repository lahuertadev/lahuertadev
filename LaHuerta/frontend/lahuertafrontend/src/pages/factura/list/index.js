import React, { useState, useEffect } from 'react';
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
      editDisabledReason: 'Ya tiene CAE: no se puede editar',
      deleteDisabledReason: 'Ya tiene CAE: no se puede eliminar',
      title: 'Facturas',
      subtitle: 'Facturas, notas de débito y notas de crédito emitidas en ARCA.',
      deleteSuccessMessage: (count) =>
        count === 1 ? 'El comprobante se eliminó correctamente.' : `Se eliminaron ${count} comprobantes correctamente.`,
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
      editDisabledReason: 'Ya tiene CAE: no se puede editar',
      deleteDisabledReason: 'Ya tiene CAE: no se puede eliminar',
      title: 'Remitos',
      subtitle: 'Remitos de entrega, sin emisión en ARCA.',
      deleteSuccessMessage: (count) =>
        count === 1 ? 'El remito se eliminó correctamente.' : `Se eliminaron ${count} remitos correctamente.`,
      newLabelText: 'Nuevo Remito',
      mapData: mapBills((bill) => bill.tipo_factura.codigo_afip === null),
    },
  },
];

// Detalle, Editar y Eliminar en una sola columna "Acción" (como Pagos de Clientes).
const SHARED = { groupActions: true };

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

  // Solapas Facturas / Remitos debajo del título, como Vigentes / Anulados en Pagos de Clientes. Las maneja
  // esta pantalla: cada una tiene su título, filtros y botón, y separa los comprobantes al mapear los datos.
  const tabs = {
    ariaLabel: 'Tipo de comprobante',
    dataTour: 'bill-tabs',
    options: tabsData.map((tab, i) => ({ label: tab.label, value: i })),
    value: activeTab,
    onChange: setActiveTab,
  };

  return (
    <GenericList
      key={activeTab}
      data={{ ...current.data, ...SHARED, tabs }}
      onAdd={() => navigate('/bill/create')}
    />
  );
};

export default BillList;
