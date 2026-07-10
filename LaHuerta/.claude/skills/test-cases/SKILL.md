---
name: test-cases
description: Genera casos de prueba manuales para una funcionalidad de La Huerta, con formato estandarizado por sección y caso numerado.
---

# Test Cases

Usar esta skill cuando el usuario pida:
- casos de prueba manuales
- test cases para probar a mano
- casos para QA
- /test-cases

## Formato de salida

Generar SIEMPRE texto plano, sin markdown, sin asteriscos, sin guiones, sin bloques de código.
El objetivo es que el usuario pueda copiar y pegar directamente en Google Docs sin que se aplique ningún estilo.

Usar esta estructura en texto plano:

Casos de Prueba — [Nombre de la funcionalidad]


Caso 1 — [Título del caso]
[Una línea describiendo la acción a realizar]

Observaciones:
- Observación 1
- Observación 2
- Observación 3


Caso 2 — [Título del caso]
...


## Reglas de redacción

- Sin markdown: no usar #, **, *, `, ---, ni ningún símbolo de formato.
- El título de cada caso debe ser corto y descriptivo.
- La descripción del caso es una sola oración que explica qué acción realizar.
- Las observaciones son los resultados esperados y comportamientos visibles a verificar.
- Redactar en español, orientado al usuario que prueba en el navegador.
- Separar casos con una línea en blanco.
- Agrupar por pantalla o flujo cuando haya más de una pantalla involucrada.
- Incluir siempre casos de error/validación además de los casos felices.

## Qué cubrir

Para cada funcionalidad, contemplar:
- Caso feliz con datos completos
- Caso feliz con campos opcionales vacíos (cuando aplique)
- Variantes de negocio relevantes
- Validaciones: campos obligatorios, formatos inválidos, duplicados
- Comportamiento visual esperado (colores, mensajes, redirecciones)
- Verificación en otras pantallas afectadas (listado, detalle)
