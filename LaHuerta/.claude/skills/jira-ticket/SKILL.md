---
name: jira-ticket
description: Genera tickets de Jira estructurados con Situación Actual, Situación Deseada y Posible Solution Approach. Si las variables de entorno de Jira están configuradas, crea el ticket directamente vía API.
---

# Jira Ticket Generator

Usar esta skill cuando el usuario pida:
- crear un ticket de Jira
- generar un ticket
- documentar una tarea o funcionalidad para Jira
- /jira-ticket

## Procedimiento

### 1. Reunir información

Si el usuario no proporcionó suficiente contexto, preguntar:
- ¿Cuál es el título del ticket?
- ¿Cuál es la situación actual (el problema o estado del proyecto hoy)?
- ¿Cuál es la situación deseada (qué se quiere lograr)?
- ¿Hay algún approach de solución en mente?

Si la conversación ya tiene contexto suficiente (se acaba de terminar de hablar sobre una funcionalidad), usar ese contexto directamente sin preguntar.

### 2. Generar el contenido del ticket

Redactar el ticket con esta estructura:

**Título:** conciso, en español, orientado a la acción (ej. "Implementar transición de estado de cheques")

**Descripción con 3 secciones:**

---

## Situación Actual
Describir el estado actual del sistema o proceso. Ser específico sobre el problema, limitación o gap existente. Mencionar qué funciona hoy y qué no.

## Situación Deseada
Describir el comportamiento o estado que se quiere alcanzar. Orientado al resultado, no a la implementación. Puede incluir criterios de aceptación.

## Posible Solution Approach
Plantear una posible solución técnica o de producto. No es un compromiso, es una guía. Puede incluir:
- Cambios en el backend
- Cambios en el frontend
- Consideraciones de negocio
- Dependencias con otras tareas

---

### 3. Crear en Jira (si hay credenciales configuradas)

Verificar si existen las siguientes variables de entorno:
- `JIRA_BASE_URL` (ej: `https://miempresa.atlassian.net`)
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`

**Si están configuradas**, leer las credenciales del archivo y crear el ticket vía API:

```bash
eval $(python3 -c "
import json
with open('/Users/pablogermanantunez/Desktop/proyectoLaHuerta/lahuertadev/LaHuerta/.claude/settings.local.json') as f:
    env = json.load(f)['env']
for k, v in env.items():
    print(f'export {k}=\"{v}\"')
") && \
curl -s -X POST \
  "${JIRA_BASE_URL}/rest/api/3/issue" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "project": { "key": "'"${JIRA_PROJECT_KEY}"'" },
      "summary": "TÍTULO_DEL_TICKET",
      "description": {
        "type": "doc",
        "version": 1,
        "content": [
          {
            "type": "heading",
            "attrs": { "level": 2 },
            "content": [{ "type": "text", "text": "Situación Actual" }]
          },
          {
            "type": "paragraph",
            "content": [{ "type": "text", "text": "CONTENIDO_SITUACION_ACTUAL" }]
          },
          {
            "type": "heading",
            "attrs": { "level": 2 },
            "content": [{ "type": "text", "text": "Situación Deseada" }]
          },
          {
            "type": "paragraph",
            "content": [{ "type": "text", "text": "CONTENIDO_SITUACION_DESEADA" }]
          },
          {
            "type": "heading",
            "attrs": { "level": 2 },
            "content": [{ "type": "text", "text": "Posible Solution Approach" }]
          },
          {
            "type": "paragraph",
            "content": [{ "type": "text", "text": "CONTENIDO_APPROACH" }]
          }
        ]
      },
      "issuetype": { "name": "Tarea" }
    }
  }'
```

Reemplazar los placeholders con el contenido real antes de ejecutar.

Tras ejecutar, mostrar al usuario:
- La URL del ticket creado (`${JIRA_BASE_URL}/browse/{KEY}`)
- El ID del ticket

**Si NO están configuradas**, mostrar el ticket formateado en markdown para que el usuario lo copie manualmente, e indicar cómo configurar las variables:

```
Para crear tickets directamente, configurá las siguientes variables de entorno:
- JIRA_BASE_URL=https://tuempresa.atlassian.net
- JIRA_EMAIL=tu@email.com
- JIRA_API_TOKEN=tu_api_token  (generalo en https://id.atlassian.com/manage-profile/security/api-tokens)
- JIRA_PROJECT_KEY=DEV
```

## Tono y estilo

- Redactar en español
- Claro y orientado al negocio, no excesivamente técnico
- La "Situación Actual" y "Situación Deseada" deben poder leerlas tanto desarrolladores como product owners
- El "Posible Solution Approach" puede ser más técnico
