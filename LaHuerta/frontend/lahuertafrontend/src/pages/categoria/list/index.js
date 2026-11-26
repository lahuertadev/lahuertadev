import React from 'react';
import Catalog, { descriptionField } from '../../../components/Catalog';
import { categoryUrl } from '../../../constants/urls';

const DELETE_EFFECTS = ['Deja de aparecer para elegir en el formulario de productos.'];
const DELETE_NOTE = 'No se puede eliminar si algún producto tiene la categoría: primero hay que cambiársela a esos productos.';

const FIELDS = [descriptionField({ placeholder: 'Ej: Frutas', maxLength: 50 })];

const CategoryList = () => (
  <Catalog
    url={categoryUrl}
    title="Categorías"
    itemLabel="categoría"
    newLabel="Nueva categoría"
    subtitle="Las categorías en que se agrupan los productos."
    breadcrumbKey="/category"
    fields={FIELDS}
    deleteEffects={DELETE_EFFECTS}
    deleteNote={DELETE_NOTE}
  />
);

export default CategoryList;
