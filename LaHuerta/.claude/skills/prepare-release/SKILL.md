---
name: prepare-release
description: Prepara el release a producción bumpeando la versión en package.json según los cambios en dev respecto a main, y haciendo el commit listo para el PR.
---

# Prepare Release

Usar esta skill cuando el usuario pida:
- preparar un release
- preparar el deploy a producción
- /prepare-release

## Contexto
El proyecto usa Dokploy con deploy automático al pushear a `main`.
El flujo es: trabajar en `dev` → crear PR `dev → main` → mergear → Dokploy deploya.
Esta skill se corre en `dev` antes de crear ese PR.

La versión vive en `frontend/lahuertafrontend/package.json`.
Usar SemVer: `MAJOR.MINOR.PATCH`
- **PATCH** (0.1.0 → 0.1.1): solo fixes, cambios menores, ajustes de UI, correcciones sin funcionalidad nueva
- **MINOR** (0.1.0 → 0.2.0): funcionalidades nuevas que no rompen lo existente
- **MAJOR** (0.1.0 → 1.0.0): cambios que rompen compatibilidad, rediseños grandes, migraciones importantes

## Procedimiento

### 1. Verificar rama actual

```bash
git branch --show-current
```

Si no está en `dev`, avisar al usuario y no continuar.

### 2. Leer la versión actual

```bash
cat frontend/lahuertafrontend/package.json | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])"
```

### 3. Analizar los cambios respecto a main

```bash
git log main..HEAD --oneline
```

```bash
git diff main..HEAD --stat
```

Con eso, analizar:
- ¿Hay funcionalidades nuevas? → MINOR
- ¿Solo hay fixes, ajustes o cambios menores? → PATCH
- ¿Hay cambios que rompan compatibilidad o rediseños grandes? → MAJOR

### 4. Proponer la nueva versión

Mostrar al usuario:
- La versión actual
- El tipo de bump detectado y por qué
- La versión nueva propuesta

Ejemplo:
```
Versión actual: 0.1.0
Cambios detectados: se agregaron 3 funcionalidades nuevas (DEV-73, DEV-76, DEV-78)
Bump sugerido: MINOR → 0.2.0
```

Preguntar al usuario si confirma antes de continuar.

### 5. Actualizar package.json

Usar `npm version` en el directorio del frontend. Esto actualiza el campo `version` en `package.json` sin crear tag de git.

```bash
cd frontend/lahuertafrontend && npm version [patch|minor|major] --no-git-tag-version
```

Reemplazar `[patch|minor|major]` según lo determinado.

### 6. Commitear el bump

```bash
git add frontend/lahuertafrontend/package.json
git commit -m "chore: bump version to X.Y.Z"
```

Reemplazar `X.Y.Z` con la versión nueva.

### 7. Confirmar al usuario

Mostrar:
```
✓ Versión actualizada a X.Y.Z en package.json
✓ Commit creado: chore: bump version to X.Y.Z

Próximo paso: crear el PR de dev → main en GitHub.
Al mergear, Dokploy desplegará automáticamente con la versión X.Y.Z.
```

## Reglas
- No pushear a ninguna rama. Solo commitear localmente.
- No crear tags de git.
- Solo correr en la rama `dev`. Si el usuario está en otra rama, avisar y no continuar.
- Si no hay diferencias entre `dev` y `main`, indicar que no hay cambios para deployar.
