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

if (fs.existsSync(path.join(src, 'components/LanguageSwitcher.vue'))) {
  throw new Error('LanguageSwitcher ainda existe')
}
if (source.includes('LanguageSwitcher')) throw new Error('LanguageSwitcher ainda está referenciado')
if (!fs.readFileSync(path.join(src, 'i18n/index.js'), 'utf8').includes("locale: 'pt-BR'")) {
  throw new Error('Locale fixo pt-BR não configurado')
}
if (!fs.readFileSync(path.join(src, 'i18n/index.js'), 'utf8').includes("fallbackLocale: 'pt-BR'")) {
  throw new Error('Fallback pt-BR não configurado')
}
if (!fs.readFileSync(path.join(src, 'i18n/index.js'), 'utf8').includes("document.documentElement.lang = 'pt-BR'")) {
  throw new Error('Atributo lang pt-BR não configurado')
}
if (!fs.readFileSync(path.join(src, 'api/index.js'), 'utf8').includes("Accept-Language'] = 'pt-BR'")) {
  throw new Error('Cabeçalho pt-BR não está fixo')
}
console.log('Locale fixo pt-BR validado')
