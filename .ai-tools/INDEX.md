# 📑 Índice de Herramientas IA - Proyecto Jewelry

## 🗂️ Navegación Rápida

| Categoría           | Documento                                                             | Descripción                              |
| ------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| **📖 General**       | [README.md](README.md)                                                | Guía principal y overview                |
|                     | [shared-context.md](shared-context.md)                                | Contexto del proyecto para todas las IAs |
|                     | [SETUP-COMPLETED.md](SETUP-COMPLETED.md)                              | ✅ Resumen de implementación              |
| **🧪 Testing**       | [test-ai-tools.sh](test-ai-tools.sh)                                  | Script validación (ejecutable)           |
| **⚙️ Configuración** | [../vscode/settings-ai-tools.json](../.vscode/settings-ai-tools.json) | Settings VS Code                         |

## 🤖 Por Herramienta

### GitHub Copilot
| Documento          | Ubicación                                                    |
| ------------------ | ------------------------------------------------------------ |
| Skills principales | [../.github/COPILOT-SKILLS.md](../.github/COPILOT-SKILLS.md) |
| Skills Claude      | [../.claude/skills/SKILLS.md](../.claude/skills/SKILLS.md)   |
| Custom Agents (6)  | [../.github/agents/](../.github/agents/)                     |

### Claude
| Documento                            | Descripción                             |
| ------------------------------------ | --------------------------------------- |
| [claude/README.md](claude/README.md) | Guía completa de uso                    |
|                                      | - Métodos de acceso (Desktop App / API) |
|                                      | - Prompts efectivos                     |
|                                      | - Workflows recomendados                |

### Copilot (Gratuito)
| Documento                              | Descripción                 |
| -------------------------------------- | --------------------------- |
| [copilot/README.md](copilot/README.md) | Guía completa de setup      |
|                                        | - Instalación extensión     |
|                                        | - Configuración keybindings |
|                                        | - Uso efectivo              |
|                                        | - Coexistencia con Copilot  |

### ChatGPT-4
| Documento                                                | Descripción                  |
| -------------------------------------------------------- | ---------------------------- |
| [chatgpt/README.md](chatgpt/README.md)                   | Guía completa de uso         |
| [chatgpt/prompts-library.md](chatgpt/prompts-library.md) | **50+ prompts listos**       |
|                                                          | - Descripciones de productos |
|                                                          | - Email marketing            |
|                                                          | - SEO keywords               |
|                                                          | - Social media               |
|                                                          | - Landing pages              |

## 🔄 Por Workflow

### Creación de Productos
| Documento                                                      | Tiempo     | Herramientas               |
| -------------------------------------------------------------- | ---------- | -------------------------- |
| [workflows/product-creation.md](workflows/product-creation.md) | ~40-60 min | Copilot + Claude + ChatGPT |

**Incluye:**
- Preparación de información
- Generación de descripciones (ChatGPT)
- Script automatizado (Copilot)
- Traducción TranslatePress
- Imágenes y categorías
- Checklist completo

### Importación Masiva
| Documento                                            | Tiempo                    | Herramientas               |
| ---------------------------------------------------- | ------------------------- | -------------------------- |
| [workflows/bulk-import.md](workflows/bulk-import.md) | ~2-3 horas (50 productos) | ChatGPT + Copilot + WP-CLI |

**Incluye:**
- Template CSV
- Script de importación
- Validación automática
- Troubleshooting

## 🎯 Por Caso de Uso

### Desarrollo de Código
1. **Copilot** - Código base con custom agents
2. **Copilot** - Autocompletado durante escritura
3. **Claude** - Code review y refactoring

### Generación de Contenido
1. **ChatGPT** - Copy y descripciones bilingües
2. **Claude** - Refinamiento y optimización SEO
3. **Copilot** - Integración en scripts

### Debugging
1. **Copilot Chat** - Primera consulta con contexto
2. **Claude** - Análisis profundo si es complejo
3. **Copilot Search** - Buscar código similar

### Marketing & SEO
1. **ChatGPT** - Usar prompts de [prompts-library.md](chatgpt/prompts-library.md)
2. **Claude** - Análisis y estrategia
3. **Copilot** - Implementación técnica

## 📚 Recursos Adicionales

### Documentación Externa
- [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- [Claude Documentation](https://docs.anthropic.com/)
- [Copilot Docs](https://copilot.com/docs)
- [ChatGPT Help](https://help.openai.com/)

### WordPress Específico
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)
- [WooCommerce Docs](https://woocommerce.github.io/code-reference/)
- [TranslatePress Plugin](https://wordpress.org/plugins/translatepress-multilingual/)

## 🚀 Quick Start

### 1. Para Comenzar (Primera Vez)
```bash
# 1. Ejecutar test
./.ai-tools/test-ai-tools.sh

# 2. Leer contexto
cat .ai-tools/shared-context.md

# 3. Copiar settings VS Code
cp .vscode/settings-ai-tools.json .vscode/settings.json

# 4. Instalar Copilot
code --install-extension github.copilot
```

### 2. Para Crear Producto
```bash
# Leer workflow
cat .ai-tools/workflows/product-creation.md

# Generar descripción con ChatGPT
# (Usar prompts de chatgpt/prompts-library.md)

# Crear script con Copilot
# (Seguir pasos en workflow)
```

### 3. Para Importación Masiva
```bash
# Leer workflow
cat .ai-tools/workflows/bulk-import.md

# Preparar CSV
# (Ver template en workflow)

# Ejecutar importación
./scripts/bulk-import-products.sh data/import-products.csv
```

## 💡 Tips de Navegación

### Encuentro Rápido

**Buscar por palabra clave:**
```bash
# Buscar "TranslatePress" en todas las guías
grep -r "TranslatePress" .ai-tools/

# Buscar prompts de email
grep -r "email" .ai-tools/chatgpt/
```

**Archivos más usados:**
1. [shared-context.md](shared-context.md) - Leer primero
2. [chatgpt/prompts-library.md](chatgpt/prompts-library.md) - Para contenido
3. [workflows/product-creation.md](workflows/product-creation.md) - Para productos
4. [README.md](README.md) - Para overview

### Estructura Visual

```
.ai-tools/
│
├── 📖 Documentación General
│   ├── README.md                 ⭐ Inicio aquí
│   ├── shared-context.md         ⭐ Contexto del proyecto
│   ├── SETUP-COMPLETED.md        ✅ Resumen implementación
│   └── INDEX.md                  📑 Este archivo
│
├── 🤖 Por Herramienta
│   ├── claude/
│   │   └── README.md
│   ├── copilot/
│   │   └── README.md
│   └── chatgpt/
│       ├── README.md
│       └── prompts-library.md    ⭐ 50+ prompts
│
├── 🔄 Workflows
│   ├── product-creation.md       ⭐ Uso frecuente
│   └── bulk-import.md
│
└── 🧪 Testing
    └── test-ai-tools.sh          🔧 Ejecutable
```

## 📊 Estadísticas de la Implementación

### Archivos Creados
- **Guías:** 7 archivos
- **Workflows:** 2 completos
- **Scripts:** 1 ejecutable
- **Prompts:** 50+ templates
- **Total líneas:** ~3,500+

### Tiempo de Setup
- **Implementación:** ✅ Completado
- **Testing:** ~2 minutos
- **Configuración inicial:** ~15 minutos
- **Primer uso:** ~30 minutos

### Cobertura
- ✅ 4 herramientas IA
- ✅ 2 workflows completos
- ✅ 6 casos de uso principales
- ✅ 50+ prompts listos

## 🎯 Siguiente Paso Recomendado

**Opción A - Testing Rápido:**
```bash
./.ai-tools/test-ai-tools.sh
```

**Opción B - Primer Producto:**
1. Leer: [workflows/product-creation.md](workflows/product-creation.md)
2. Usar prompt de: [chatgpt/prompts-library.md](chatgpt/prompts-library.md)
3. Implementar con Copilot

**Opción C - Setup Completo:**
1. Instalar extensiones VS Code
2. Configurar Copilot (gratis)
3. Suscribirse ChatGPT Plus ($20)
4. Crear proyecto Claude (opcional)

---

**Última actualización:** 10 de febrero de 2026
**Versión:** 1.0.0
**Mantenedor:** GitHub Copilot + Claude
