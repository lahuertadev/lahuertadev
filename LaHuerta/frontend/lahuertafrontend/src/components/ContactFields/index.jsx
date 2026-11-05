import React from 'react';
import { useFormikContext } from 'formik';
import * as Yup from 'yup';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SpotlightButton from '../SpotlightButton';
import RequiredMark from '../RequiredMark';
import { formatPhone, PHONE_MAX_DIGITS } from '../../utils/phone';

export const EMPTY_CONTACT = { numero: '', descripcion: '', email: '' };

// Validación de la lista de contactos para el validationSchema del formulario.
export const contactsSchema = Yup.array()
  .of(
    Yup.object({
      numero: Yup.string().required('El teléfono es obligatorio'),
      descripcion: Yup.string().max(50, 'La descripción puede tener hasta 50 caracteres'),
      email: Yup.string().email('Ingresá un email válido'),
    })
  )
  .min(1, 'Cargá al menos un contacto');

// Contactos del backend → filas del formulario (descripción y email NULL → '').
export const toContactRows = (contacts) =>
  contacts?.length
    ? contacts.map((contact) => ({
        id: contact.id,
        numero: contact.numero || '',
        descripcion: contact.descripcion || '',
        email: contact.email || '',
      }))
    : [{ ...EMPTY_CONTACT }];

// Filas del formulario → contactos para el backend: sin id se crean; vacíos van como null.
export const toContactsPayload = (rows) =>
  rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    numero: row.numero,
    descripcion: row.descripcion.trim() || null,
    email: row.email.trim() || null,
  }));

const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

// Columnas de una fila en desktop: teléfono, descripción, email y el botón de eliminar (alto de un input).
const rowGridCls = 'md:grid-cols-[1fr_1.2fr_1.5fr_42px]';

const FieldError = ({ error }) => (error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null);

/**
 * ContactFields — contactos de un cliente o proveedor en su formulario Formik: una fila por contacto
 * (teléfono obligatorio, descripción y email opcionales) con su botón para eliminarla, y "Agregar contacto".
 * Siempre queda al menos una fila. En mobile cada contacto es una tarjeta con los campos apilados.
 *
 * Va dentro de un <Formik>: toma values, errors, touched, setFieldValue y handleBlur del contexto.
 *
 * Props:
 *   name                   — campo de Formik con la lista de contactos (default: 'contacts')
 *   tourPrefix             — prefijo de los data-tour: el primer teléfono es `${tourPrefix}-phone`
 *   descriptionPlaceholder — ejemplo de descripción según la entidad
 */
const ContactFields = ({ name = 'contacts', tourPrefix, descriptionPlaceholder = 'Ej. Compras, Pagos' }) => {
  const { values, errors, touched, setFieldValue, handleBlur } = useFormikContext();
  const contacts = values[name];
  const canRemove = contacts.length > 1;

  const fieldError = (index, field) =>
    touched[name]?.[index]?.[field] ? errors[name]?.[index]?.[field] : undefined;

  const updateContact = (index, field, value) =>
    setFieldValue(name, contacts.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)));

  const addContact = () => setFieldValue(name, [...contacts, { ...EMPTY_CONTACT }]);

  const removeContact = (index) => setFieldValue(name, contacts.filter((_, i) => i !== index));

  const removeButton = (index) => (
    <SpotlightButton
      variant="danger"
      onClick={() => removeContact(index)}
      disabled={!canRemove}
      aria-label={`Eliminar contacto ${index + 1}`}
      className="h-[42px] w-[42px] shrink-0"
    >
      <DeleteIcon sx={{ fontSize: 20 }} />
    </SpotlightButton>
  );

  return (
    <div className="md:col-span-3 flex flex-col gap-3">
      <div className={`hidden md:grid ${rowGridCls} gap-4`}>
        <span className={`${labelCls} !mb-0`}>Teléfono<RequiredMark /></span>
        <span className={`${labelCls} !mb-0`}>Descripción</span>
        <span className={`${labelCls} !mb-0`}>Email</span>
      </div>

      {contacts.map((contact, index) => {
        const phoneError = fieldError(index, 'numero');
        const descriptionError = fieldError(index, 'descripcion');
        const emailError = fieldError(index, 'email');
        return (
          <div
            key={index}
            className="rounded-lg border border-border-subtle bg-surface p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0"
          >
            <div className="flex items-center justify-between mb-3 md:hidden">
              <span className="text-sm font-bold text-accent">Contacto {index + 1}</span>
              {removeButton(index)}
            </div>
            <div className={`grid grid-cols-1 ${rowGridCls} gap-3 md:gap-4 md:items-start`}>
              <div data-tour={index === 0 ? `${tourPrefix}-phone` : undefined}>
                <label className={`${labelCls} md:hidden`} htmlFor={`${name}-${index}-numero`}>Teléfono<RequiredMark /></label>
                <input
                  id={`${name}-${index}-numero`}
                  name={`${name}.${index}.numero`}
                  type="tel"
                  value={formatPhone(contact.numero)}
                  onChange={(e) => updateContact(index, 'numero', e.target.value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS))}
                  onBlur={handleBlur}
                  placeholder="11-XXXX-XXXX"
                  aria-required="true"
                  aria-label={`Teléfono del contacto ${index + 1}`}
                  className={inputCls(Boolean(phoneError))}
                />
                <FieldError error={phoneError} />
              </div>
              <div>
                <label className={`${labelCls} md:hidden`} htmlFor={`${name}-${index}-descripcion`}>Descripción</label>
                <input
                  id={`${name}-${index}-descripcion`}
                  name={`${name}.${index}.descripcion`}
                  value={contact.descripcion}
                  onChange={(e) => updateContact(index, 'descripcion', e.target.value)}
                  onBlur={handleBlur}
                  maxLength={50}
                  placeholder={descriptionPlaceholder}
                  aria-label={`Descripción del contacto ${index + 1}`}
                  className={inputCls(Boolean(descriptionError))}
                />
                <FieldError error={descriptionError} />
              </div>
              <div>
                <label className={`${labelCls} md:hidden`} htmlFor={`${name}-${index}-email`}>Email</label>
                <input
                  id={`${name}-${index}-email`}
                  name={`${name}.${index}.email`}
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(index, 'email', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="nombre@empresa.com"
                  aria-label={`Email del contacto ${index + 1}`}
                  className={inputCls(Boolean(emailError))}
                />
                <FieldError error={emailError} />
              </div>
              <div className="hidden md:block">{removeButton(index)}</div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-col-reverse gap-3 pt-1 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-on-surface-muted">
          Tiene que quedar al menos un contacto. Descripción y email son opcionales.
        </p>
        <SpotlightButton
          variant="outline"
          onClick={addContact}
          className="w-full md:w-auto shrink-0 px-4 py-2.5 text-sm"
          data-tour={`${tourPrefix}-contact-add`}
        >
          <AddIcon sx={{ fontSize: 18 }} /> Agregar contacto
        </SpotlightButton>
      </div>
    </div>
  );
};

export default ContactFields;
