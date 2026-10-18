import { useEffect, useState } from 'react';
import { supplierUrl, productUrl, saleTypeUrl } from '../../../constants/urls';
import { loadOptions } from '../../../utils/selectOptions';

const withLabel = (field) => (data) => data.map((entry) => ({ label: entry[field], ...entry }));
const asIs = (data) => data;

// Opciones que necesita el bloque de compra: proveedores, productos y tipos de venta.
const useBuyOptions = () => {
  const [options, setOptions] = useState({ suppliers: [], products: [], saleTypes: [] });

  useEffect(() => {
    Promise.all([
      loadOptions(supplierUrl, withLabel('nombre')),
      loadOptions(productUrl, withLabel('descripcion')),
      loadOptions(saleTypeUrl, asIs),
    ]).then(([suppliers, products, saleTypes]) =>
      setOptions({ suppliers, products, saleTypes })
    );
  }, []);

  return options;
};

export default useBuyOptions;
