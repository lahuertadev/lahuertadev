import React from 'react';
import SimpleCatalog from '../../../components/SimpleCatalog';
import { ConditionIvaTypeUrl } from '../../../constants/urls';

const ConditionIvaTypeList = () => (
  <SimpleCatalog
    url={ConditionIvaTypeUrl}
    title="Condición de IVA"
    breadcrumbKey="/condition-iva-type"
    placeholder="Ej: Responsable Monotributo"
    maxLength={20}
  />
);

export default ConditionIvaTypeList;
