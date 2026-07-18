# Português do Brasil no MiroFish — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar toda a interface e todo o conteúdo gerado pelo MiroFish fixos em português do Brasil.

**Architecture:** Reutilizar o `vue-i18n` e o mecanismo de locale já existentes, adicionando um catálogo `pt-BR` com as mesmas chaves de `en.json`. Fixar `pt-BR` no frontend, no cabeçalho `Accept-Language` e no backend; remover o seletor de idioma e reforçar nos prompts que somente campos de linguagem natural devem ser traduzidos.

**Tech Stack:** Vue 3, vue-i18n, Vite, Flask, Python 3.12, pytest.

## Global Constraints

- Português do Brasil fixo, sem seletor de idioma.
- Preservar MiroFish, Zep, NVIDIA, Kimi, API, JSON, nomes próprios e conteúdo literal do usuário.
- Não alterar endpoints, formatos JSON, nomes de variáveis ou chaves de configuração.
- Não alterar o fluxo funcional, layout, responsividade ou identidade visual.
- Campos enumerados e identificadores exigidos pelas APIs continuam em inglês.

---

### Task 1: Catálogo completo de português do Brasil

**Files:**
- Create: `locales/pt-BR.json`
- Modify: `locales/languages.json`
- Create: `backend/tests/test_locale_pt_br.py`

**Interfaces:**
- Consumes: estrutura de chaves de `locales/en.json`.
- Produces: locale `pt-BR`, rótulo `Português (Brasil)` e instrução de LLM acessível por `get_language_instruction()`.

- [ ] **Step 1: Criar o teste que valida paridade de chaves e instrução de idioma**

```python
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def flatten(value, prefix=""):
    result = set()
    for key, item in value.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(item, dict):
            result.update(flatten(item, path))
        else:
            result.add(path)
    return result


def test_pt_br_catalog_matches_english_keys():
    english = json.loads((ROOT / "locales/en.json").read_text(encoding="utf-8"))
    portuguese = json.loads((ROOT / "locales/pt-BR.json").read_text(encoding="utf-8"))
    assert flatten(portuguese) == flatten(english)


def test_pt_br_language_instruction_is_explicit():
    languages = json.loads((ROOT / "locales/languages.json").read_text(encoding="utf-8"))
    assert languages["pt-BR"]["label"] == "Português (Brasil)"
    assert "português do Brasil" in languages["pt-BR"]["llmInstruction"]
```

- [ ] **Step 2: Executar o teste e confirmar a falha inicial**

Run: `cd backend && uv run pytest tests/test_locale_pt_br.py -v`

Expected: FAIL porque `locales/pt-BR.json` ainda não existe.

- [ ] **Step 3: Registrar o locale brasileiro**

Adicionar a `locales/languages.json`:

```json
"pt-BR": {
  "label": "Português (Brasil)",
  "llmInstruction": "Responda sempre em português do Brasil, com linguagem natural e clara. Preserve nomes próprios, marcas, trechos literais fornecidos pelo usuário, nomes de campos JSON, identificadores técnicos e valores enumerados exigidos pelas APIs."
}
```

- [ ] **Step 4: Criar o catálogo `pt-BR.json`**

Criar um objeto JSON com paridade exata de chaves com `locales/en.json`. Traduzir todos os valores visíveis para português brasileiro natural; preservar placeholders como `{id}`, `{error}`, `{count}`, tags HTML e slots de interpolação sem qualquer alteração.

- [ ] **Step 5: Executar o teste de catálogo**

Run: `cd backend && uv run pytest tests/test_locale_pt_br.py -v`

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add locales/languages.json locales/pt-BR.json backend/tests/test_locale_pt_br.py
git commit -m "feat: adiciona catálogo pt-BR"
```

### Task 2: Fixar português no frontend e remover seletor

**Files:**
- Modify: `frontend/src/i18n/index.js`
- Modify: `frontend/src/api/index.js`
- Modify: `frontend/src/views/Home.vue`
- Modify: `frontend/src/views/MainView.vue`
- Modify: `frontend/src/views/SimulationView.vue`
- Modify: `frontend/src/views/SimulationRunView.vue`
- Modify: `frontend/src/views/ReportView.vue`
- Modify: `frontend/src/views/InteractionView.vue`
- Delete: `frontend/src/components/LanguageSwitcher.vue`
- Create: `frontend/scripts/validate-fixed-locale.mjs`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: mensagens `pt-BR` da Task 1.
- Produces: `i18n.global.locale.value === 'pt-BR'` e todas as requisições com `Accept-Language: pt-BR`.

- [ ] **Step 1: Criar validador que falha enquanto houver seletor ou locale variável**

```javascript
import fs from 'node:fs'
import path from 'node:path'

const src = path.resolve('src')
const files = []
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
  const full = path.join(dir, entry.name)
  entry.isDirectory() ? walk(full) : files.push(full)
})
walk(src)

const source = files.filter(file => /\.(vue|js)$/.test(file))
  .map(file => fs.readFileSync(file, 'utf8')).join('\n')

if (source.includes('LanguageSwitcher')) throw new Error('LanguageSwitcher ainda está referenciado')
if (!fs.readFileSync(path.join(src, 'i18n/index.js'), 'utf8').includes("locale: 'pt-BR'")) {
  throw new Error('Locale fixo pt-BR não configurado')
}
if (!fs.readFileSync(path.join(src, 'api/index.js'), 'utf8').includes("Accept-Language'] = 'pt-BR'")) {
  throw new Error('Cabeçalho pt-BR não está fixo')
}
console.log('Locale fixo pt-BR validado')
```

- [ ] **Step 2: Adicionar script de validação e confirmar a falha**

Adicionar a `frontend/package.json`:

```json
"validate:locale": "node scripts/validate-fixed-locale.mjs"
```

Run: `cd frontend && npm run validate:locale`

Expected: FAIL indicando referências ao `LanguageSwitcher`.

- [ ] **Step 3: Fixar `pt-BR` no vue-i18n**

Em `frontend/src/i18n/index.js`, configurar:

```javascript
const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'pt-BR',
  messages
})
document.documentElement.lang = 'pt-BR'
```

Remover a leitura de `localStorage` e a exportação de `availableLocales`.

- [ ] **Step 4: Fixar o cabeçalho da API**

Em `frontend/src/api/index.js`, substituir a atribuição dinâmica por:

```javascript
config.headers['Accept-Language'] = 'pt-BR'
```

- [ ] **Step 5: Remover o seletor de todas as views**

Remover `<LanguageSwitcher />` e seus imports das seis views listadas, depois excluir `frontend/src/components/LanguageSwitcher.vue`.

- [ ] **Step 6: Validar locale fixo e build**

Run: `cd frontend && npm run validate:locale && npm run build`

Expected: `Locale fixo pt-BR validado` e build Vite concluído sem erros.

- [ ] **Step 7: Commit**

```bash
git add frontend
git commit -m "feat: fixa interface em português do Brasil"
```

### Task 3: Traduzir textos diretos fora do catálogo

**Files:**
- Modify: `frontend/src/views/Process.vue`
- Modify: `frontend/src/api/index.js`
- Modify: arquivos `.vue` identificados pela auditoria de texto residual.
- Create: `frontend/scripts/audit-visible-language.mjs`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: interface fixa `pt-BR` da Task 2.
- Produces: relatório automatizado sem textos visíveis em chinês e sem mensagens operacionais em inglês.

- [ ] **Step 1: Criar auditoria de caracteres chineses em templates e strings**

```javascript
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')
const failures = []
const scan = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
  const file = path.join(dir, entry.name)
  if (entry.isDirectory()) return scan(file)
  if (!/\.(vue|js)$/.test(file)) return
  const text = fs.readFileSync(file, 'utf8')
  const withoutComments = text
    .replace(/<!--[^]*?-->/g, '')
    .replace(/\/\*[^]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  withoutComments.split('\n').forEach((line, index) => {
    if (/\p{Script=Han}/u.test(line)) failures.push(`${file}:${index + 1}: ${line.trim()}`)
  })
})
scan(root)
if (failures.length) throw new Error(`Texto chinês visível encontrado:\n${failures.join('\n')}`)
console.log('Nenhum texto chinês visível encontrado')
```

- [ ] **Step 2: Executar auditoria e registrar as ocorrências iniciais**

Run: `cd frontend && node scripts/audit-visible-language.mjs`

Expected: FAIL listando textos diretos, principalmente em `views/Process.vue`.

- [ ] **Step 3: Traduzir textos diretos e mensagens técnicas**

Substituir textos chineses visíveis por português brasileiro e traduzir mensagens operacionais próprias em inglês, incluindo `Unknown error`, `Request timeout`, `Network Error` e `Request failed, retrying`, sem alterar valores recebidos das APIs.

- [ ] **Step 4: Executar auditoria e build**

Run: `cd frontend && node scripts/audit-visible-language.mjs && npm run build`

Expected: auditoria e build concluídos sem erro.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: traduz textos residuais da interface"
```

### Task 4: Fixar português no backend e nas respostas do modelo

**Files:**
- Modify: `backend/app/utils/locale.py`
- Modify: `backend/app/services/zep_tools.py`
- Create: `backend/tests/test_fixed_pt_br_locale.py`

**Interfaces:**
- Consumes: registro `pt-BR` da Task 1.
- Produces: `get_locale() -> 'pt-BR'`, `get_language_instruction()` em português e instrução de citações adequada ao idioma.

- [ ] **Step 1: Criar testes do locale fixo**

```python
from app.utils.locale import get_language_instruction, get_locale, set_locale


def test_default_locale_is_pt_br():
    set_locale("en")
    assert get_locale() == "pt-BR"


def test_language_instruction_preserves_technical_contracts():
    instruction = get_language_instruction()
    assert "português do Brasil" in instruction
    assert "JSON" in instruction
    assert "identificadores técnicos" in instruction
```

- [ ] **Step 2: Executar teste e confirmar a falha**

Run: `cd backend && uv run pytest tests/test_fixed_pt_br_locale.py -v`

Expected: FAIL porque o backend ainda aceita locale dinâmico.

- [ ] **Step 3: Fixar o backend em `pt-BR`**

Em `backend/app/utils/locale.py`, definir `FIXED_LOCALE = 'pt-BR'`; fazer `set_locale()` gravar sempre esse valor e `get_locale()` retornar sempre esse valor. Fazer `t()` usar `pt-BR` e usar o mesmo catálogo como fallback.

- [ ] **Step 4: Ajustar instruções específicas de linguagem**

Em `backend/app/services/zep_tools.py`, produzir a instrução:

```python
quote_instruction = 'Use aspas duplas ao citar literalmente as pessoas entrevistadas e preserve o texto original da citação.'
```

Manter intactas as exigências já existentes para `poster_type`, `stance`, `gender`, nomes de campos JSON e valores enumerados em inglês.

- [ ] **Step 5: Executar os testes do backend**

Run: `cd backend && uv run pytest tests/test_locale_pt_br.py tests/test_fixed_pt_br_locale.py -v`

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/utils/locale.py backend/app/services/zep_tools.py backend/tests
git commit -m "feat: fixa respostas da IA em português do Brasil"
```

### Task 5: Verificação integrada e documentação de uso

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: projeto validado, instruções de execução local e checklist de simulação em português.

- [ ] **Step 1: Documentar a edição em português**

Adicionar ao Quick Start do `README.md` que esta edição usa português do Brasil fixo e que a chave de LLM deve apontar para um endpoint compatível com OpenAI. Não incluir chaves reais nem conteúdo de `.env`.

- [ ] **Step 2: Executar validações automatizadas**

Run:

```bash
cd frontend && npm run validate:locale && node scripts/audit-visible-language.mjs && npm run build
cd ../backend && uv run pytest -v
```

Expected: validações de idioma aprovadas, build Vite concluído e suíte pytest aprovada.

- [ ] **Step 3: Executar verificação local de inicialização**

Run: `npm run dev`

Expected: frontend em `http://localhost:3000`, backend em `http://localhost:5001` e `GET /api/simulation/history?limit=20` retornando HTTP 200.

- [ ] **Step 4: Verificação funcional manual**

Usar material público e não confidencial, executar uma simulação curta e confirmar: interface em português; progresso em português; personas e eventos em português; relatório final em português; nomes próprios e campos técnicos preservados.

- [ ] **Step 5: Commit final**

```bash
git add README.md
git commit -m "docs: documenta edição pt-BR"
```

