export const formatCuit = (cuit) => {
    const prefix = cuit.slice(0, 2); 
    const middle = cuit.slice(2, 10); 
    const suffix = cuit.slice(10); 
  
    return `${prefix}-${middle}-${suffix}`;
  };