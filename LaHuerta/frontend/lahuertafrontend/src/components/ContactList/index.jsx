import React from 'react';
import { formatPhone } from '../../utils/phone';

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider';

const rowGridCls = 'md:grid-cols-[1fr_1.2fr_1.5fr]';

// Valor de una celda: los vacíos se muestran con "—" en gris.
const Value = ({ children, className = '' }) =>
  children ? (
    <span className={`text-sm text-on-surface break-all ${className}`}>{children}</span>
  ) : (
    <span className="text-sm text-on-surface-muted">—</span>
  );

/**
 * ContactList — contactos de un cliente o proveedor en su detalle: una tabla (teléfono, descripción y
 * email) en desktop y un contacto debajo del otro en mobile.
 *
 * Props:
 *   contacts — lista de { id, numero, descripcion, email } del backend
 */
const ContactList = ({ contacts = [] }) => (
  <div className="md:col-span-3">
    <div className={`hidden md:grid ${rowGridCls} gap-4 pb-2.5`}>
      <span className={labelCls}>Teléfono</span>
      <span className={labelCls}>Descripción</span>
      <span className={labelCls}>Email</span>
    </div>
    {contacts.length === 0 && <Value />}
    {contacts.map((contact, index) => (
      <div
        key={contact.id}
        className={`grid grid-cols-1 ${rowGridCls} gap-2.5 md:gap-4 md:items-center py-3 ${
          index === 0 ? 'pt-0 md:pt-3' : ''
        } border-border-subtle ${index === 0 ? 'md:border-t' : 'border-t'}`}
      >
        <div>
          <span className={`${labelCls} md:hidden mb-0.5`}>Teléfono</span>
          <Value className="font-medium">{formatPhone(contact.numero)}</Value>
        </div>
        <div>
          <span className={`${labelCls} md:hidden mb-0.5`}>Descripción</span>
          <Value>{contact.descripcion}</Value>
        </div>
        <div>
          <span className={`${labelCls} md:hidden mb-0.5`}>Email</span>
          <Value>{contact.email}</Value>
        </div>
      </div>
    ))}
  </div>
);

export default ContactList;
