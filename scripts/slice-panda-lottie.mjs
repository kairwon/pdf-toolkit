import fs from 'node:fs'

const source = JSON.parse(fs.readFileSync(new URL('../public/panda.json', import.meta.url), 'utf8'))
const frameLayers = source.layers.filter(layer => layer.ty === 2 && layer.refId)
const assetById = new Map(source.assets.map(asset => [asset.id, asset]))

function makeAnimation(name, indices, frameDuration = 6) {
  const layers = indices.map((sourceIndex, outputIndex) => {
    const original = frameLayers[sourceIndex]
    const start = outputIndex * frameDuration
    return {
      ...original,
      ind: outputIndex + 1,
      ip: start,
      op: start + frameDuration,
      st: 0,
    }
  })

  const usedIds = [...new Set(layers.map(layer => layer.refId))]
  return {
    ...source,
    nm: name,
    ip: 0,
    op: indices.length * frameDuration,
    layers,
    assets: usedIds.map(id => assetById.get(id)),
  }
}

function range(start, end, step = 1) {
  const values = []
  if (step > 0) for (let value = start; value <= end; value += step) values.push(value)
  else for (let value = start; value >= end; value += step) values.push(value)
  return values
}

const animations = {
  'panda-awake.json': makeAnimation('Hua Hua — awake while resting', range(18, 31), 5),
  'panda-ask-feed.json': makeAnimation('Hua Hua — asks for attention', [
    ...range(20, 38),
    ...range(38, 31, -1),
    ...range(32, 38),
  ]),
  'panda-thanks.json': makeAnimation('Hua Hua — thanks', range(46, 74)),
  'panda-dance.json': makeAnimation('Hua Hua — happy dance', [
    ...range(72, 86),
    ...range(85, 74, -1),
  ]),
  'panda-sad.json': makeAnimation('Hua Hua — disappointed and lies down', range(28, 0, -1)),
}

for (const [filename, animation] of Object.entries(animations)) {
  fs.writeFileSync(
    new URL(`../public/${filename}`, import.meta.url),
    JSON.stringify(animation),
  )
  console.log(`${filename}: ${animation.layers.length} frames, ${animation.op / animation.fr}s`)
}
