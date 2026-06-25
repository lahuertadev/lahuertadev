---
name: run-tests
description: Corre los tests del backend de La Huerta e interpreta los resultados correctamente, distinguiendo errores de conexión a DB de fallos reales.
---

# Run Tests

Usar esta skill cuando el usuario pida:
- correr los tests
- verificar que los tests pasan
- /run-tests

## Contexto importante antes de correr

Los tests del backend se dividen en dos categorías:

### Tests que NO necesitan DB (corren siempre)
- `test_service.py` — usan mocks/fakes, corren en local sin problema.
- `test_urls.py` — solo resuelven rutas.

### Tests que SÍ necesitan DB (fallan en local sin conexión)
- `test_repository.py` — ejecutan queries reales contra MySQL.
- `test_viewset.py` / `test_views.py` — levantan la app con DB real.

**Estos tests deben correr dentro del contenedor Docker** (`lahuerta_backend`), no desde el entorno local, porque el host `db` no se resuelve fuera de la red de Docker.

## Cómo correr los tests

### Opción A — Solo tests sin DB (local, rápido)
```bash
cd LaHuerta/backend && source venv/bin/activate
pytest --no-cov -k "not repository and not viewset and not views"
```

### Opción B — Todos los tests (requiere Docker levantado)
```bash
docker exec lahuerta_backend pytest --no-cov
```

Verificar que el contenedor esté corriendo antes:
```bash
docker compose -f LaHuerta/docker-compose.dev.yml ps
```

## Cómo interpretar los resultados

| Resultado | Significado |
|---|---|
| `PASSED` | Test OK |
| `FAILED` | Fallo real — hay que investigar |
| `ERROR` con `OperationalError: Unknown MySQL server host 'db'` | No hay conexión a DB — correr desde Docker |
| `ERROR` de colección (import mismatch) | Falta `__init__.py` en algún directorio `tests/` |

## Qué reportar al usuario

1. Separar los `FAILED` reales de los `ERROR` por conexión a DB.
2. Verificar si los `FAILED` son en archivos que tocamos o son preexistentes.
3. Solo marcar como problema los `FAILED` en código modificado en esta sesión.
4. Si hay errores de conexión, avisar que hay que correr desde Docker para validar esos tests.
