import React from 'react';
import Catalog, { descriptionField } from '../../../components/Catalog';
import { unitTypeUrl } from '../../../constants/urls';
import { MEASUREMENT_TYPE_OPTIONS } from '../../../constants/unitTypes';

const DELETE_EFFECTS = ['Deja de aparecer para elegir en el formulario de productos.'];
const DELETE_NOTE = 'No se puede eliminar si algún producto tiene el tipo de unidad: primero hay que cambiárselo a esos productos.';

const FIELDS = [
  descriptionField({ placeholder: 'Ej: Cajón', maxLength: 20 }),
  { name: 'abreviacion', label: 'Abreviatura', placeholder: 'Ej: caj', maxLength: 5, requiredMessage: 'Escribí la abreviatura.' },
  { name: 'tipo_medicion', label: 'Medición', type: 'select', options: MEASUREMENT_TYPE_OPTIONS },
];

const UnitTypeList = () => (
  <Catalog
    url={unitTypeUrl}
    title="Tipos de unidad"
    itemLabel="tipo de unidad"
    newLabel="Nuevo tipo de unidad"
    subtitle="Las unidades en que se venden los productos y si se miden por peso o por cantidad."
    breadcrumbKey="/unit-type"
    fields={FIELDS}
    deleteEffects={DELETE_EFFECTS}
    deleteNote={DELETE_NOTE}
  />
);

export default UnitTypeList;
