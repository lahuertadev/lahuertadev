import React from 'react';
import Catalog, { descriptionField } from '../../../components/Catalog';
import { ConditionIvaTypeUrl } from '../../../constants/urls';

const FIELDS = [descriptionField({ placeholder: 'Ej: Responsable Monotributo', maxLength: 20 })];

const ConditionIvaTypeList = () => (
  <Catalog
    url={ConditionIvaTypeUrl}
    title="Condiciones de IVA"
    itemLabel="condición de IVA"
    newLabel="Nueva condición de IVA"
    subtitle="Las condiciones frente al IVA de los clientes, para facturar."
    breadcrumbKey="/condition-iva-type"
    fields={FIELDS}
  />
);

export default ConditionIvaTypeList;
