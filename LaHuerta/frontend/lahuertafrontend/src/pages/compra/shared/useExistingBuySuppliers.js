import { useEffect, useState } from 'react';
import axios from 'axios';
import { buyUrl } from '../../../constants/urls';

/**
 * Proveedores que ya tienen una compra cargada en la fecha indicada.
 * Una sola consulta por fecha; se usa para avisar (sin bloquear) que se está
 * cargando otra compra al mismo proveedor ese día.
 *
 * excludeBuyId — compra a ignorar (la que se está editando, para que no se avise a sí misma)
 */
const useExistingBuySuppliers = (date, excludeBuyId = null) => {
  const [supplierIds, setSupplierIds] = useState([]);

  useEffect(() => {
    if (!date) {
      setSupplierIds([]);
      return undefined;
    }

    let ignore = false;
    axios
      .get(buyUrl, { params: { fecha_desde: date, fecha_hasta: date } })
      .then((response) => {
        if (ignore) return;
        setSupplierIds(
          response.data
            .filter((buy) => String(buy.id) !== String(excludeBuyId))
            .map((buy) => buy.proveedor.id)
        );
      })
      .catch(console.error);

    return () => { ignore = true; };
  }, [date, excludeBuyId]);

  return supplierIds;
};

export default useExistingBuySuppliers;
