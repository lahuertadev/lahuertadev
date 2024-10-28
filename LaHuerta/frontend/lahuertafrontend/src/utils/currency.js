  //* Función para formatear la moneda/importe
  export const formatCurrency = (amount) => {
    let numAmount;

    if (typeof amount === 'string') {
        numAmount = parseFloat(amount.replace(',', '.'));
    } else if (typeof amount === 'number') {
        numAmount = amount;
    } else {
        return amount;
    }

    //? Formateo a peso argentino
    return numAmount.toLocaleString('es-AR', { 
        style: 'currency', 
        currency: 'ARS', 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
};