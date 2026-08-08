import { writeFile } from 'node:fs/promises'

const commit = (process.env.RELEASE_COMMIT || 'local-development').trim()
const payload = {
  service: 'labofpdf',
  commit,
  builtAt: new Date().toISOString(),
}

await writeFile(new URL('../dist/release.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Wrote release manifest for ${commit}`)
