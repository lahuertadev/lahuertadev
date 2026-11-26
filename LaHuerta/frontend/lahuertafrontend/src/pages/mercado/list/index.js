import React from 'react';
import Catalog, { descriptionField } from '../../../components/Catalog';
import { marketUrl } from '../../../constants/urls';

const FIELDS = [descriptionField({ placeholder: 'Ej: Mercado Central', maxLength: 50 })];

const MarketList = () => (
  <Catalog
    url={marketUrl}
    title="Mercados"
    itemLabel="mercado"
    newLabel="Nuevo mercado"
    subtitle="Los mercados donde están los puestos de los proveedores."
    breadcrumbKey="/market"
    fields={FIELDS}
  />
);

export default MarketList;
