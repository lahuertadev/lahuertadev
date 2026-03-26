import React from 'react';
import SimpleCatalog from '../../components/SimpleCatalog';
import { bankUrl } from '../../constants/urls';

const BankList = () => (
  <SimpleCatalog
    url={bankUrl}
    title="Banco"
    breadcrumbKey="/bank"
    placeholder="Ej: Banco Nación"
    maxLength={50}
  />
);

export default BankList;
