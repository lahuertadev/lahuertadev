import React from 'react';
import SimpleCatalog from '../../../components/SimpleCatalog';
import { categoryUrl } from '../../../constants/urls';

const CategoryList = () => (
  <SimpleCatalog
    url={categoryUrl}
    title="Categoría"
    breadcrumbKey="/category"
    placeholder="Ej: Frutas"
    maxLength={50}
  />
);

export default CategoryList;

