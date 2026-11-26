import React from 'react';
import SimpleCatalog from '../../../components/SimpleCatalog';
import { categoryUrl } from '../../../constants/urls';

const CategoryList = () => (
  <SimpleCatalog
    url={categoryUrl}
    title="Categorías"
    itemLabel="categoría"
    newLabel="Nueva categoría"
    subtitle="Las categorías en que se agrupan los productos."
    breadcrumbKey="/category"
    placeholder="Ej: Frutas"
    maxLength={50}
  />
);

export default CategoryList;

