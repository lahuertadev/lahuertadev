import React from 'react';
import SimpleCatalog from '../../components/SimpleCatalog';
import { bankUrl } from '../../constants/urls';

const BankList = () => (
  <SimpleCatalog
    url={bankUrl}
    title="Bancos"
    itemLabel="banco"
    newLabel="Nuevo banco"
    subtitle="Los bancos de los cheques de clientes y de los cheques propios."
    breadcrumbKey="/bank"
    placeholder="Ej: Banco Nación"
    maxLength={50}
  />
);

export default BankList;
