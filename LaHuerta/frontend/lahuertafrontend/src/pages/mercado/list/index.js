import React from 'react';
import SimpleCatalog from '../../../components/SimpleCatalog';
import { marketUrl } from '../../../constants/urls';

const MarketList = () => (
  <SimpleCatalog
    url={marketUrl}
    title="Mercados"
    itemLabel="mercado"
    newLabel="Nuevo mercado"
    subtitle="Los mercados donde están los puestos de los proveedores."
    breadcrumbKey="/market"
    placeholder="Ej: Mercado Central"
    maxLength={50}
  />
);

export default MarketList;
