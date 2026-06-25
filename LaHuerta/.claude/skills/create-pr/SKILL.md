---
name: create-pr
description: Crea un Pull Request en GitHub usando gh CLI. Commitea los cambios pendientes, pushea la rama y abre el PR con título y descripción estructurada hacia la rama dev.
---

# Create PR

Usar esta skill cuando el usuario pida:
- crear un PR / pull request
- commitear, pushear y crear PR
- subir los cambios a GitHub
- /create-pr

## Prerequisitos

Verificar que `gh` esté instalado:
```bash
which gh
```

Si no está instalado:
```bash
brew install gh
```

Verificar autenticación:
```bash
gh auth status
```

Si no está autenticado:
```bash
gh auth login
```

## Flujo completo

### 1. Revisar estado antes de commitear

```bash
git status
git diff
git log --oneline -5
```

### 2. Stagear y commitear

Stagear solo los archivos del trabajo actual (nunca `git add .` a ciegas — puede incluir `.env`, credenciales o binarios).

```bash
git add archivo1 archivo2 ...
git commit -m "$(cat <<'EOF'
tipo(TICKET): descripción corta

Detalle de los cambios...

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 3. Pushear

```bash
git push -u origin <rama-actual>
```

### 4. Crear PR apuntando a `dev`

El título del PR siempre sigue este formato:

```
feature/DEV-XXX --> descripción de la funcionalidad
```

Donde `XXX` es el número del ticket Jira extraído del nombre de la rama (ej. rama `feature/DEV-88` → título `feature/DEV-88 --> Corregir sección de Reportes`).

```bash
gh pr create --base dev --head <rama-actual> --title "feature/DEV-XXX --> descripción de la funcionalidad" --body "$(cat <<'EOF'
## Resumen

- Bullet 1
- Bullet 2

## Cambios backend

- archivo: qué cambió

## Cambios frontend

- archivo: qué cambió

## Test plan

- [ ] Caso 1
- [ ] Caso 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Reglas importantes

- La rama base siempre es `dev`, no `main`.
- No hacer `git add -A` ni `git add .` — stagear archivos específicos.
- No incluir en el commit: `.env`, `settings.local.json`, archivos de credenciales, binarios o archivos generados fuera del repo.
- Si `gh` no está autenticado, hacer `gh auth login` antes de crear el PR.
- Si el PR ya existe para la rama, usar `gh pr edit` en lugar de `gh pr create`.

## Verificar que el PR se creó

```bash
gh pr view
```
