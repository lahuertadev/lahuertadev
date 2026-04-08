import React from 'react';

/**
 * Componente reutilizable para el panel izquierdo de marketing en las vistas de autenticación
 * @param {string} titleLine1 - Primera línea del título
 * @param {string} titleLine2 - Segunda línea del título (puede incluir emoji)
 * @param {string} description - Texto descriptivo
 */
const AuthMarketingPanel = ({ titleLine1, titleLine2, description }) => {
  return (
    <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-lahuerta to-little-blue-lahuerta text-white flex-col justify-center p-12">
      <div className="text-5xl font-extrabold mb-6">
        <div>{titleLine1}</div>
        <div>{titleLine2}</div>
      </div>
      <p className="text-lg leading-relaxed opacity-90">
        {description}
      </p>
    </div>
  );
};

export default AuthMarketingPanel;

