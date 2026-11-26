import React from 'react';
import SimpleCatalog from '../../../components/SimpleCatalog';
import { ConditionIvaTypeUrl } from '../../../constants/urls';

const ConditionIvaTypeList = () => (
  <SimpleCatalog
    url={ConditionIvaTypeUrl}
    title="Condiciones de IVA"
    itemLabel="condición de IVA"
    newLabel="Nueva condición de IVA"
    subtitle="Las condiciones frente al IVA de los clientes, para facturar."
    breadcrumbKey="/condition-iva-type"
    placeholder="Ej: Responsable Monotributo"
    maxLength={20}
  />
);

export default ConditionIvaTypeList;
