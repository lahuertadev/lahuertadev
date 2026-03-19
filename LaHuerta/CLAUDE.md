# La Huerta

## Contexto
Proyecto full stack de gestión comercial para La Huerta.

Stack principal:
- Backend: Python, Django, Django REST Framework, MySQL
- Frontend: React, React Router, Axios, Material UI

## Cómo trabajar en este repo
- Seguir siempre los patrones reales ya existentes en el proyecto.
- Antes de proponer código, analizar una implementación similar dentro del repo.
- Priorizar consistencia con La Huerta por sobre patrones genéricos o académicos.
- No introducir arquitectura nueva si el proyecto no la usa.
- Para instrucciones específicas, consultar las reglas en `.claude/rules/`.
- Para tareas repetibles, usar las skills en `.claude/skills/`.

## Backend
- Seguir separación por capas con views, serializers, repositories y services cuando corresponda.
- No usar service para endpoints triviales sin lógica de dominio.
- Testear repository, service y views según el patrón del proyecto.

## Frontend
- Reutilizar componentes, constantes y utilidades existentes.
- Distinguir entre CRUD completo y catálogo simple inline.
- No crear pantallas o abstracciones innecesarias.

## Estilo de trabajo
Antes de implementar:
1. resumir enfoque
2. listar archivos a tocar
3. indicar patrón elegido
4. recién después proponer código

## Functional documentation
- Toda funcionalidad nueva o cambio funcional relevante debe evaluar si requiere crear o actualizar documentación en `docs/funcionalidades/`.
- Seguir la regla `functional-documentation.md`.