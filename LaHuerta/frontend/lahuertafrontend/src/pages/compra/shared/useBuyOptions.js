import { useEffect, useState } from 'react';
import { supplierUrl, productUrl, saleTypeUrl, containerTypeUrl } from '../../../constants/urls';
import { loadOptions } from '../../../utils/selectOptions';

const withLabel = (field) => (data) => data.map((entry) => ({ label: entry[field], ...entry }));
const asIs = (data) => data;

// Opciones que necesita el bloque de compra: proveedores, productos, tipos de venta y de contenedor.
const useBuyOptions = () => {
  const [options, setOptions] = useState({ suppliers: [], products: [], saleTypes: [], containerTypes: [] });

  useEffect(() => {
    Promise.all([
      loadOptions(supplierUrl, withLabel('nombre')),
      loadOptions(productUrl, withLabel('descripcion')),
      loadOptions(saleTypeUrl, asIs),
      loadOptions(containerTypeUrl, asIs),
    ]).then(([suppliers, products, saleTypes, containerTypes]) =>
      setOptions({ suppliers, products, saleTypes, containerTypes })
    );
  }, []);

  return options;
};

export default useBuyOptions;
