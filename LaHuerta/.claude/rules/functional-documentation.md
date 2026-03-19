# Functional documentation

Aplicar esta regla cuando se cree, modifique o refactorice una funcionalidad del sistema.

## Objetivo
Toda funcionalidad nueva o cambio relevante debe dejar documentación funcional breve y clara para facilitar:
- mantenimiento futuro
- onboarding
- explicación del sistema
- entendimiento del flujo de negocio
- trazabilidad de cambios funcionales

## Cuándo documentar
Crear o actualizar documentación cuando se:
- agregue una funcionalidad nueva
- modifique un flujo de negocio existente
- agregue un CRUD nuevo
- cambie una validación importante
- cambie el comportamiento visible para el usuario
- agregue una integración o dependencia funcional nueva

No hace falta documentar cambios mínimos de estilo, refactors internos sin impacto funcional o ajustes puramente técnicos sin efecto en el uso del sistema.

## Dónde documentar
La documentación funcional debe guardarse en:
- `docs/funcionalidades/`

Usar un archivo por módulo o funcionalidad.

Ejemplos:
- `docs/funcionalidades/clientes.md`
- `docs/funcionalidades/facturacion.md`
- `docs/funcionalidades/pagos-clientes.md`
- `docs/funcionalidades/listas-precios.md`

## Qué debe hacer Claude
Cuando implemente una funcionalidad nueva o modifique una funcionalidad existente de forma relevante, debe:

1. indicar si corresponde crear o actualizar documentación funcional
2. proponer el archivo de documentación a tocar
3. redactar o actualizar la documentación junto con el cambio si el usuario lo está implementando
4. explicar el flujo de uso en pasos claros y orientados al negocio
5. mantener la documentación alineada con el comportamiento real del sistema

## Contenido mínimo esperado
Cada documento funcional debe incluir, cuando aplique:

- nombre de la funcionalidad
- objetivo
- alcance
- flujo de uso paso a paso
- validaciones o reglas de negocio importantes
- pantallas involucradas
- endpoints involucrados si aporta valor explicativo
- consideraciones importantes
- impacto sobre otras funcionalidades si existe

## Plantilla sugerida
Usar esta estructura base cuando se cree un documento nuevo:

# Nombre de la funcionalidad

## Objetivo
Explicar qué resuelve esta funcionalidad.

## Alcance
Indicar qué incluye y qué no incluye.

## Flujo de uso
1. Paso 1
2. Paso 2
3. Paso 3

## Validaciones importantes
- Regla 1
- Regla 2

## Pantallas involucradas
- Pantalla 1
- Pantalla 2

## Consideraciones
- Consideración 1
- Consideración 2

## Regla de mantenimiento
Si una funcionalidad cambia de forma relevante, su documentación también debe actualizarse.

## Forma de responder
Cuando Claude proponga una implementación funcional relevante, debe indicar también:
- si requiere documentación
- qué archivo de `docs/funcionalidades/` crear o actualizar
- un borrador inicial del contenido si corresponde