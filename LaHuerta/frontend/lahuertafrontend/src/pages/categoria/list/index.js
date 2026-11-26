import React from 'react';
import Catalog, { descriptionField } from '../../../components/Catalog';
import { categoryUrl } from '../../../constants/urls';

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
  />
);

export default CategoryList;
