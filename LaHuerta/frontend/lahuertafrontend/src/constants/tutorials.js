// Tutoriales guiados (DEV-138). Los tutoriales y sus pasos están en la base de datos (app
// `tutorial` del backend, tablas tutorial y tutorial_paso) y se cargan con migraciones de datos;
// el frontend los pide a GET /tutorials/ y los recorre con components/TutorialGuide.
//
// Lo que sí queda en el código es lo que conecta los pasos con las pantallas:
//   - cada pantalla marca sus elementos con data-tour="<nombre>" (el `elemento` de cada paso);
//   - al guardar, avisa con emitTutorialEvent(evento, { id }) (el `evento` de cada paso).
// Si se renombra un data-tour o un evento, hay que actualizar los pasos con una migración.

// Nombre del evento del navegador con el que las pantallas avisan al tutorial.
export const TUTORIAL_EVENT_NAME = 'lahuerta:tutorial';

// Eventos que emiten las pantallas después de un guardado exitoso (respuesta 2xx). Coinciden con
// el campo `evento` de los pasos (tutorial_paso).
export const TUTORIAL_EVENTS = {
  clientCreated: 'client-created',
  billCreated: 'bill-created',
  clientPaymentCreated: 'client-payment-created',
  purchaseCreated: 'purchase-created',
  emptyMovementCreated: 'empty-movement-created',
  ownCheckCreated: 'own-check-created',
};

// Estados que guarda el backend (tutorial/constants.py).
export const TUTORIAL_STATUS = {
  started: 'iniciado',
  completed: 'completado',
  skipped: 'omitido',
};

// Estado que se muestra cuando el usuario nunca empezó el tutorial (no se guarda en el backend).
export const TUTORIAL_PENDING = 'pendiente';

export const TUTORIAL_STATUS_LABELS = {
  [TUTORIAL_PENDING]: 'Pendiente',
  [TUTORIAL_STATUS.started]: 'Sin terminar',
  [TUTORIAL_STATUS.completed]: 'Completado',
  [TUTORIAL_STATUS.skipped]: 'Omitido',
};

// Milisegundos que se espera a que aparezca el elemento de un paso antes de mostrar el globo centrado.
export const TUTORIAL_TARGET_WAIT_MS = 1500;

// Milisegundos que se espera el elemento de un paso opcional antes de saltearlo.
export const TUTORIAL_OPTIONAL_WAIT_MS = 500;

// Cada cuánto se revisa si el paso se completó (además de los eventos de los campos).
export const TUTORIAL_CHECK_INTERVAL_MS = 300;

// Mismo corte que la grilla (components/Grid): en mobile no hay columnas de acciones.
export const TUTORIAL_MOBILE_QUERY = '(max-width:600px)';
