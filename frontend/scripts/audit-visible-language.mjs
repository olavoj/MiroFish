import fs from 'node:fs'
import path from 'node:path'
import { NodeTypes, parse as parseTemplate } from '@vue/compiler-dom'
import { parse as parseSfc } from '@vue/compiler-sfc'

const root = path.resolve('src')
const failures = []
const approvedSnapshotPath = path.resolve('scripts/approved-visible-literals.json')
const approvedVisibleLiterals = new Set(JSON.parse(fs.readFileSync(approvedSnapshotPath, 'utf8')).literals)
const extractedCandidates = new Set()
const technicalAllowlist = new Set([
  'API', 'JSON', 'UUID', 'ID', 'LLM', 'MiroFish', 'Zep', 'NVIDIA', 'Kimi',
  'POST', 'LIKE', 'COMMENT', 'PDF', 'MD', 'TXT', 'RELATED', 'RELATED_TO',
  'SELF_LOOP', 'Entity', 'Node', 'Twitter', 'Reddit'
])

const operationalEnglish = [
  /Waiting for Report Agent\.\.\./,
  /Waiting for agent activity\.\.\./,
  /Waiting for agent actions\.\.\./,
  /(['"`])You\1/,
  /(['"`])Agent(?:\1|\s|\$)/,
  /(['"`])Report Agent\1/,
  /(['"`])Error\1/,
  /(['"`])Completed\1/,
  /(['"`])Processing\1/,
  /(['"`])Ready\1/,
  /\bStep\s+\d+(?:\/\d+)?\b/,
  /\bSTEP\s+\d+\b/
]

const legacyResponseTokens = [
  '采访摘要与核心观点', '采访对象选择理由', 'Twitter平台回答', 'Reddit平台回答', '（该平台未获得回复）',
  '(该平台未获得回复)', '[无回复]', '【当前有效事实】', '【历史\\/过期事实】', '【关键事实】', '【核心实体】',
  '【涉及实体】', '【关系链】', '历史\\/过期事实', '分析的子问题', '相关预测事实:', '预测场景:',
  '分析问题:', '当前有效事实:', '总节点数:', '总边数:', '采访主题:', '采访人数:', '搜索查询:', '相关边:',
  '相关节点:', '关键引言', '采访实录', '采访 #\\d+:', '选择([^（(]+)', '^未选|^综上|^最终选择',
  '找到\\s*(\\d+)\\s*条', '相关事实:', '涉及实体:', '关系链:', '简介:', '摘要:', '查询:', '错误', '警告', '最终答案'
]

const extractQuotedLiterals = source => [...source.matchAll(/(['\"`])((?:\\.|(?!\1)[^\\])*)\1/g)]
  .map(match => match[2])

const extractVisibleCandidates = (source, file) => {
  const candidates = []
  const template = parseSfc(source).descriptor.template?.content || ''

  // Parse Vue templates structurally so mixed text/interpolation nodes are never skipped.
  const visibleAttributes = new Set(['title', 'placeholder', 'aria-label', 'alt'])
  const walkTemplate = node => {
    if (node.type === NodeTypes.TEXT) candidates.push(node.content)
    if (node.type === NodeTypes.INTERPOLATION) {
      candidates.push(...extractQuotedLiterals(node.content.content || ''))
    }
    if (node.type === NodeTypes.ELEMENT) {
      for (const prop of node.props) {
        if (prop.type === NodeTypes.ATTRIBUTE && visibleAttributes.has(prop.name) && prop.value) {
          candidates.push(prop.value.content)
        }
        if (
          prop.type === NodeTypes.DIRECTIVE &&
          prop.name === 'bind' &&
          prop.arg?.isStatic &&
          visibleAttributes.has(prop.arg.content) &&
          prop.exp
        ) {
          candidates.push(...extractQuotedLiterals(prop.exp.content))
        }
      }
    }
    for (const child of node.children || []) walkTemplate(child)
  }
  if (template) walkTemplate(parseTemplate(template, { comments: false }))

  // Script strings are rendered when passed to a UI/logging field. Route names and API fields are not candidates.
  const scriptSources = file.endsWith('.js')
    ? [source]
    : [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1])

  for (const scriptSource of scriptSources) {
    for (const line of stripComments(scriptSource).split('\n')) {
      if (/\b(?:addLog|alert|console|message|label|title|placeholder|tooltip|header|statusText)\b/.test(line) || /\bh\s*\(/.test(line)) {
        candidates.push(...extractQuotedLiterals(line))
      }
    }

    // Capture multiline render/log calls and multiline UI property values.
    for (const match of scriptSource.matchAll(/\b(?:h|addLog|alert|console\.(?:log|warn|error))\s*\([\s\S]{0,500}?\)/g)) {
      candidates.push(...extractQuotedLiterals(match[0]))
    }
    for (const match of scriptSource.matchAll(/\b(?:message|label|title|placeholder|tooltip|header|statusText)\s*:\s*(['\"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      candidates.push(match[2])
    }
  }

  return candidates
}

const stripComments = source => {
  let insideBlockComment = false

  return source.split('\n').map(line => {
    let result = ''
    let quote = null
    let escaped = false

    for (let index = 0; index < line.length; index++) {
      const char = line[index]
      const next = line[index + 1]

      if (insideBlockComment) {
        if (char === '*' && next === '/') {
          insideBlockComment = false
          index++
        }
        continue
      }

      if (quote) {
        result += char
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === quote) quote = null
        continue
      }

      if (char === '\'' || char === '\"' || char === '`') {
        quote = char
        result += char
        continue
      }

      if (char === '/' && next === '*') {
        insideBlockComment = true
        index++
        continue
      }

      // This runs only outside a quoted literal, so URLs and text such as "https://…" are retained.
      if (char === '/' && next === '/') break

      result += char
    }

    return result
  }).join('\n')
}

const removeLegacyResponseTokens = (file, line) => {
  if (!file.endsWith('Step4Report.vue')) return line
  return legacyResponseTokens.reduce((result, token) => result.replaceAll(token, ''), line)
}

const scan = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
  const file = path.join(dir, entry.name)
  if (entry.isDirectory()) return scan(file)
  if (!/\.(vue|js)$/.test(file)) return
  const text = fs.readFileSync(file, 'utf8')
  const withoutComments = stripComments(text.replace(/<!--[^]*?-->/g, ''))
  withoutComments.split('\n').forEach((line, index) => {
    const textForHanAudit = removeLegacyResponseTokens(file, line)
    if (/\p{Script=Han}/u.test(textForHanAudit)) {
      failures.push(`${file}:${index + 1}: ${line.trim()}`)
    }
    if (operationalEnglish.some(pattern => pattern.test(line))) {
      failures.push(`${file}:${index + 1}: texto operacional em inglês: ${line.trim()}`)
    }
  })
  extractVisibleCandidates(withoutComments, file).forEach(candidate => {
    const normalized = candidate.replace(/\s+/g, ' ').trim()
    if (!normalized || !/[\p{L}\p{N}]/u.test(normalized)) return
    extractedCandidates.add(normalized)
    if (!technicalAllowlist.has(normalized) && !approvedVisibleLiterals.has(normalized)) failures.push(`${file}: literal visível não aprovado: ${normalized}`)
  })
})
scan(root)

const isApprovedCandidate = candidate => technicalAllowlist.has(candidate) || approvedVisibleLiterals.has(candidate)

// Regression proof: unknown UI copy must be denied by default.
if (isApprovedCandidate('Untranslated status')) {
  throw new Error('A auditoria aceitou indevidamente um literal de UI desconhecido')
}

if (process.argv.includes('--print-candidates')) {
  console.log(JSON.stringify({ literals: [...extractedCandidates].sort() }, null, 2))
  process.exit(0)
}
if (failures.length) throw new Error(`Texto visível não traduzido encontrado:\n${failures.join('\n')}`)
console.log('Nenhum texto visível em chinês ou inglês operacional encontrado')
