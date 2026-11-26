import React from 'react';
import Catalog, { descriptionField } from '../../components/Catalog';
import { bankUrl } from '../../constants/urls';

const FIELDS = [descriptionField({ placeholder: 'Ej: Banco Nación', maxLength: 50 })];

const BankList = () => (
  <Catalog
    url={bankUrl}
    title="Bancos"
    itemLabel="banco"
    newLabel="Nuevo banco"
    subtitle="Los bancos de los cheques de clientes y de los cheques propios."
    breadcrumbKey="/bank"
    fields={FIELDS}
  />
);

export default BankList;
