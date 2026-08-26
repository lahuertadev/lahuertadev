import React from 'react';
import SimpleCatalog from '../../../components/SimpleCatalog';
import { marketUrl } from '../../../constants/urls';

const MarketList = () => (
  <SimpleCatalog
    url={marketUrl}
    title="Mercado"
    breadcrumbKey="/market"
    placeholder="Ej: Mercado Central"
    maxLength={50}
  />
);

export default MarketList;
