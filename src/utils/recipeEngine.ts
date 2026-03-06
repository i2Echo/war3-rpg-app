const RARITY_COST: Record<string, number> = {
  G: 1,
  F: 2,
  E: 3,
  D: 4,
  C: 6,
  B: 8,
  A: 11,
  S: 15,
}

// 稀缺度权重：S>>>>A>B>>C=D=E=F
const RARITY_SCARCITY: Record<string, number> = {
  S: 1000,
  A: 100,
  B: 10,
  C: 1,
  D: 1,
  E: 1,
  F: 1,
  G: 1,
}

const RANDOM_A_ACCESSORY_EXCLUDES = new Set([
  '东正护符',
  '天皇祭冠',
  '人马银座',
  '匠神之手',
  '天狼邪眼',
])

const RANDOM_A_ACCESSORY_UNIQUES = new Set([
  '古兰圣火令',
  '幻木宝镜',
  '魔雾',
  '饕餮扳指A',
  '愚者项链',
  '月之密铃',
  '战鬼之心',
  '真知之石',
])

const RANDOM_A_ACCESSORY_WEIGHTS: Record<string, number> = {
  党魂军令: 15,
  梵天纹章: 15,
  封神结: 15,
  海洋之心: 15,
  烈神珠: 15,
  太古项链: 15,
  魔悲石: 5,
  失乐魔羽: 5,
}

const DEFAULT_COST = 7
const STEP_COST = 1
const MAX_DEPTH = 8
const MAX_TOTAL_ROUTES = 400
const MAX_CHILD_ROUTES = 8
const MAX_EXPANSIONS = 25000

type Nullable<T> = T | null

type ItemCategory = '武器类' | '衣服类' | '鞋子类' | '饰品类'
type ItemSlot = '战武' | '法武' | '衣' | '鞋' | '饰'
type ItemAttribute = '力量' | '敏捷' | '智力' | '全能'

type QueryMode = 'attribute' | 'slot' | 'any' | 'unknown'

type TokenKind = 'item' | 'generic' | 'any' | 'unknown'

const NAME_ALIAS_MAP: Record<string, string> = {
  玛丽亚圣石: '玛利亚圣石',
  摩西戒杖: '摩西诫杖',
  酸雨羽扇: '酸与羽扇',
  枯叶: '枯夜',
  巽狼刀: '撰狼刀',
  '幻剑.天珑': '幻剑·天陇',
  斯贝斯之诅咒: '斯贝斯的诅咒',
  罂栗骨杖: '罂粟骨杖',
  磨枪诺亚: '魔枪诺亚',
  '真.饕餮戒指': '真·饕餮扳指',
  '真·饕餮戒指': '真·饕餮扳指',
  真饕餮扳指: '真·饕餮扳指',
  '真.饕餮扳指': '真·饕餮扳指',
  天狼斜眼: '天狼邪眼',
  海洋之星: '海洋之心',
}

const EXTRA_FORMULA_LINES = [
  '光络镜杖+光羽之靴=雅典娜神杖，100%，固定炼化，无视顺序',
]

interface IngredientChoice {
  name: string
  quantity: number
}

interface IngredientSlot {
  alternatives: IngredientChoice[]
}

interface RecipeRule {
  id: string
  output: string
  ingredientSlots: IngredientSlot[]
  source: string
  chance: number
  note: string
  exclusive: boolean
  randomOutput: boolean
}

interface InternalRouteIngredient {
  name: string
  quantity: number
  route: RouteNode
}

type RouteComparator = (a: RouteNode, b: RouteNode) => number

export interface RouteNode {
  item: string
  cost: number
  successRate: number
  ruleId: Nullable<string>
  ingredients: InternalRouteIngredient[]
  note?: string
  exclusive?: boolean
}

export interface DisplayRoute {
  id: string
  item: string
  cost: number
  steps: number
  successRate: number
  specialNotes: string[]
  tree: RouteNode
}

export interface RecipeSearchResult {
  routes: DisplayRoute[]
  truncated: boolean
}

export interface ItemMeta {
  name: string
  rarity: string
  attribute: ItemAttribute
  category: ItemCategory
  slot: ItemSlot
  badge: string
  special: 'unique' | 'scroll' | 'once' | ''
}

export interface FormulaInfo {
  output: string
  chance: number
  note: string
  exclusive: boolean
  ingredientText: string
}

export interface TokenView {
  label: string
  kind: TokenKind
  clickable: boolean
  queryToken?: string
  badgeText?: string
  badgeRarity?: string
  specialText?: string
}

interface QueryDescriptor {
  mode: QueryMode
  rarity?: string
  attribute?: ItemAttribute
  slot?: ItemSlot
  raw: string
}

export interface ItemQueryResult {
  descriptor: QueryDescriptor
  items: ItemMeta[]
}

export interface RecipeEngine {
  ruleCount: number
  outputList: string[]
  allNames: string[]
  itemNames: string[]
  findRoutes: (target: string) => RecipeSearchResult
  describeToken: (token: string) => TokenView
  getItemMetas: (itemName: string) => ItemMeta[]
  getFormulaInfos: (itemName: string) => FormulaInfo[]
  queryItems: (input: string) => ItemQueryResult
}

function extractSpecialMark(value: string): {name: string; special: 'unique' | 'scroll' | 'once' | ''} {
  const match = (value || '').match(/^(.+?)\((唯一|卷轴合成|一次)\)/)
  if (match) {
    const specialMap = {'唯一': 'unique', '卷轴合成': 'scroll', '一次': 'once'} as const
    return {
      name: match[1],
      special: specialMap[match[2] as keyof typeof specialMap]
    }
  }
  return {name: value, special: ''}
}

function cleanText(value: string): string {
  return (value || '')
    .replace(/[【】]/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function cleanToken(value: string): string {
  return cleanText(value).replace(/^(或者|或)/, '')
}

function normalizeItemName(name: string): string {
  const normalized = cleanToken(name)
  // 统一装备名称中的'.'为'·'
  const unified = (NAME_ALIAS_MAP[normalized] || normalized).replace(/\./g, '·')
  return unified
}

function parseQuantity(token: string): IngredientChoice {
  let name = cleanToken(token)
  let quantity = 1

  const prefixCount = name.match(/^(\d+)(.+)$/)
  if (prefixCount) {
    quantity = Number(prefixCount[1])
    name = prefixCount[2]
  }

  const suffixCount = name.match(/^(.+)\*(\d+)$/)
  if (suffixCount) {
    name = suffixCount[1]
    quantity *= Number(suffixCount[2])
  }

  return {
    name: normalizeItemName(name),
    quantity,
  }
}

function expandABToken(token: string): string[] {
  const normalized = cleanToken(token)
  const match = normalized.match(/^([SGFEDCBA]{2,})(.+)$/)
  if (!match) {
    return [normalized]
  }

  const raritySet = match[1].split('')
  const suffix = match[2]

  if (!suffix || raritySet.length < 2) {
    return [normalized]
  }

  return [...new Set(raritySet)].map((rarity) => `${rarity}${suffix}`)
}

function parseRaritySuffixToken(token: string): Nullable<{ rarity: string; suffix: string }> {
  const normalized = cleanToken(token)
  const match = normalized.match(/^([SGFEDCBA]{1,})(.+)$/)
  if (!match || !match[2]) {
    return null
  }

  return {
    rarity: match[1],
    suffix: match[2],
  }
}

function isRarityOnlyToken(token: string): boolean {
  return /^[SGFEDCBA]{1,}$/.test(cleanToken(token))
}

function isSharedSuffixToken(token: string): boolean {
  const normalized = cleanToken(token)
  return /^(力量|敏捷|智力|全能|任意|战武|法武|衣|鞋|饰|饰品|非力量|非敏捷|非智力|非全能)$/.test(normalized)
}

function normalizeSlashAlternatives(rawAlternatives: string[]): string[] {
  const tokens = rawAlternatives
    .map((value) => cleanToken(value))
    .filter(Boolean)

  const normalized: string[] = []
  let lastRarity = ''
  let lastSuffix = ''

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const full = parseRaritySuffixToken(token)

    if (full) {
      normalized.push(token)
      lastRarity = full.rarity
      lastSuffix = full.suffix
      continue
    }

    if (isSharedSuffixToken(token) && lastRarity) {
      normalized.push(`${lastRarity}${token}`)
      lastSuffix = token
      continue
    }

    if (isRarityOnlyToken(token)) {
      let inferredSuffix = lastSuffix

      if (!inferredSuffix) {
        for (let nextIndex = index + 1; nextIndex < tokens.length; nextIndex += 1) {
          const next = tokens[nextIndex]
          const nextFull = parseRaritySuffixToken(next)
          if (nextFull) {
            inferredSuffix = nextFull.suffix
            break
          }
        }
      }

      if (inferredSuffix) {
        normalized.push(`${token}${inferredSuffix}`)
        lastRarity = token
        lastSuffix = inferredSuffix
      } else {
        normalized.push(token)
        lastRarity = token
      }

      continue
    }

    normalized.push(token)
  }

  return normalized
}

function parseIngredientSlots(expr: string): IngredientSlot[] {
  const mainPart = cleanText(expr).split(/[，,。]/)[0]
  if (!mainPart) {
    return []
  }

  const rawSlots = mainPart
    .split('+')
    .map((segment) => segment.trim())
    .filter(Boolean)

  return rawSlots
    .map((slot) => {
      const rawAlternatives = slot
        .split('/')
        .map((value) => value.trim())
        .filter(Boolean)

      const normalizedAlternatives = normalizeSlashAlternatives(rawAlternatives)

      const alternatives = normalizedAlternatives
        .flatMap(expandABToken)
        .map(parseQuantity)
        .filter((item) => item.name)

      if (!alternatives.length) {
        return null
      }

      return { alternatives }
    })
    .filter((slot): slot is IngredientSlot => slot !== null)
}

function splitOutputSegments(expr: string): string[] {
  const line = cleanText(expr)
  if (!line) {
    return []
  }

  return line
    .split(/[；;]/)
    .map((part) => cleanText(part))
    .filter(Boolean)
}

function splitIngredientSegments(expr: string): string[] {
  const normalized = expr.trim()
  if (!normalized) {
    return []
  }

  return normalized
    .split(/[；;]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function parseOutputSegment(segment: string): { name: string; chance: Nullable<number>; note: string } {
  const chanceMatches = [...segment.matchAll(/(\d+(?:\.\d+)?)%/g)]
  const chance = chanceMatches.length
    ? Number(chanceMatches[chanceMatches.length - 1][1])
    : null

  const name = normalizeItemName(segment.split(/[，,。]/)[0])

  let note = segment
    .replace(name, '')
    .replace(/，?(\d+(?:\.\d+)?)%/g, '')
    .replace(/^[，,；;。]+/, '')
    .trim()

  note = cleanToken(note)

  return {
    name,
    chance,
    note,
  }
}

function extractGlobalChance(line: string): number {
  const matches = [...line.matchAll(/(\d+(?:\.\d+)?)%/g)]
  if (!matches.length) {
    return 100
  }

  return Number(matches[matches.length - 1][1])
}

function extractExclusionNote(line: string): string {
  const matches = [...line.matchAll(/（([^）]*(?:非|不包括)[^）]*)）/g)]
  if (!matches.length) {
    return ''
  }

  return matches
    .map((entry) => cleanToken(entry[1]))
    .filter(Boolean)
    .join('；')
}

function extractGlobalNote(expr: string): string {
  const chunks = expr.split(/[，,]/)
  if (chunks.length <= 1) {
    return ''
  }

  const note = chunks
    .slice(1)
    .join('，')
    .replace(/(\d+(?:\.\d+)?)%/g, '')
    .replace(/[；;。]+/g, '，')
    .replace(/^，+/, '')
    .replace(/，+/g, '，')
    .trim()

  return cleanToken(note)
}

function isExclusiveText(note: string): boolean {
  return /专属|只能|仅|专用|皮肤|任务所需/.test(note)
}

function stripLeadingNarration(expr: string): string {
  return expr.replace(/^(?:但是|然而|不过|举例|比如|例如|说明|备注)[：:,，\s]*/g, '')
}

function stripLeadingFormulaPrefix(expr: string): string {
  const trimmed = stripLeadingNarration(expr.trim())
  const plusIndex = trimmed.indexOf('+')
  if (plusIndex === -1) {
    return trimmed
  }

  const lastDelimiter = Math.max(
    trimmed.lastIndexOf('，', plusIndex),
    trimmed.lastIndexOf(',', plusIndex),
    trimmed.lastIndexOf('：', plusIndex),
    trimmed.lastIndexOf(':', plusIndex),
  )

  if (lastDelimiter === -1) {
    return trimmed
  }

  return trimmed.slice(lastDelimiter + 1)
}

function parseFormulaLine(rawLine: string, lineNumber: number): RecipeRule[] {
  const line = rawLine.trim()
  if (!line || !line.includes('=')) {
    return []
  }

  if (/^说明：/.test(line)) {
    return []
  }

  if (/属于普通|没有专用炼化公式|也可以打/.test(line)) {
    return []
  }

  const splitIndex = line.indexOf('=')
  const left = line.slice(0, splitIndex)
  const right = line.slice(splitIndex + 1)

  const leftHasPlus = left.includes('+')
  const rightHasPlus = right.includes('+')

  if (!leftHasPlus && !rightHasPlus) {
    return []
  }

  let outputExpr = ''
  let ingredientExpr = ''

  if (!leftHasPlus && rightHasPlus) {
    outputExpr = stripLeadingNarration(left)
    ingredientExpr = stripLeadingFormulaPrefix(right)
  } else if (leftHasPlus && !rightHasPlus) {
    outputExpr = stripLeadingNarration(right)
    ingredientExpr = stripLeadingFormulaPrefix(left)
  } else {
    return []
  }

  const outputSegments = splitOutputSegments(outputExpr)
  if (!outputSegments.length) {
    return []
  }

  const parsedOutputs = outputSegments
    .map((segment) => parseOutputSegment(segment))
    .filter((parsed) => !!parsed.name)

  if (!parsedOutputs.length) {
    return []
  }

  const isRandomOutput =
    parsedOutputs.length > 1 || parsedOutputs.some((parsed) => /^随机/.test(parsed.name))

  const globalChance = extractGlobalChance(line)
  const globalNote = extractGlobalNote(`${outputExpr}，${ingredientExpr}`)
  const exclusionNote = extractExclusionNote(line)

  const ingredientSegments = splitIngredientSegments(ingredientExpr)
  if (parsedOutputs.length === 1 && ingredientSegments.length > 1) {
    const output = parsedOutputs[0]

    return ingredientSegments
      .map((segment, index) => {
        const ingredientSlots = parseIngredientSlots(segment)
        if (!ingredientSlots.length) {
          return null
        }

        const segmentChance = extractGlobalChance(segment)
        const segmentNote = extractGlobalNote(segment)
        const baseNote = segmentNote || output.note || globalNote
        const note = [baseNote, exclusionNote].filter(Boolean).join('；')

        return {
          id: `${lineNumber}-${index}`,
          output: output.name,
          ingredientSlots,
          source: line,
          chance: segmentChance,
          note,
          exclusive: isExclusiveText(note),
          randomOutput: isRandomOutput,
        }
      })
      .filter((rule): rule is RecipeRule => rule !== null)
  }

  const ingredientSlots = parseIngredientSlots(ingredientExpr)
  if (!ingredientSlots.length) {
    return []
  }

  return parsedOutputs
    .map((parsed, index) => {
      const baseNote = parsed.note || globalNote
      const note = [baseNote, exclusionNote].filter(Boolean).join('；')
      const chance = parsed.chance ?? globalChance ?? 100

      return {
        id: `${lineNumber}-${index}`,
        output: parsed.name,
        ingredientSlots,
        source: line,
        chance,
        note,
        exclusive: isExclusiveText(note),
        randomOutput: isRandomOutput,
      }
    })
    .filter((rule): rule is RecipeRule => rule !== null)
}

function stripExplanationSection(rawText: string): string {
  const lines = rawText.split(/\r?\n/)
  const markerIndex = lines.findIndex((line) => {
    const normalized = line.trim().replace(/^#+\s*/, '')
    return (
      normalized.startsWith('说明：') ||
      normalized.startsWith('说明:') ||
      /说明[（(]以下部分不做炼化公式正则解析/.test(normalized)
    )
  })
  if (markerIndex === -1) {
    return rawText
  }

  return lines.slice(0, markerIndex).join('\n')
}

function detectRarityLetter(name: string): Nullable<string> {
  if (!name) {
    return null
  }

  const typePrefix = name.match(/^([SGFEDCBA])(?:战武|法武|衣|鞋|饰|智力|力量|敏捷|全能|任意)/)
  if (typePrefix) {
    return typePrefix[1]
  }

  const randomPrefix = name.match(/随机([SGFEDCBA])/)
  if (randomPrefix) {
    return randomPrefix[1]
  }

  const suffix = name.match(/([SGFEDCBA])$/)
  if (suffix) {
    return suffix[1]
  }

  return null
}

function parseRandomOutputToken(name: string): { rarity: string; slot: ItemSlot; label: string } | null {
  const match = name.match(/^随机([SGFEDCBA])(战武|法武|衣|鞋|饰|饰品)$/)
  if (!match) {
    return null
  }

  const rarity = match[1]
  const rawSlot = match[2]
  const slot = rawSlot === '饰品' ? '饰' : (rawSlot as ItemSlot)
  const label = `随机${rarity}${rawSlot === '饰品' ? '饰' : rawSlot}`
  return { rarity, slot, label }
}

function isRandomAccessoryExcluded(name: string): boolean {
  return RANDOM_A_ACCESSORY_EXCLUDES.has(name) || RANDOM_A_ACCESSORY_UNIQUES.has(name)
}

function buildRandomOutputDistribution(
  rarity: string,
  slot: ItemSlot,
  itemMetasByName: Map<string, ItemMeta[]>,
): Array<{ name: string; weight: number }> {
  if (rarity === 'A' && slot === '饰') {
    const weighted: Array<{ name: string; weight: number }> = []
    for (const [name, weight] of Object.entries(RANDOM_A_ACCESSORY_WEIGHTS)) {
      const metas = itemMetasByName.get(name) || []
      if (metas.some((meta) => meta.rarity === rarity && meta.slot === slot && !meta.special)) {
        weighted.push({ name, weight })
      }
    }

    if (weighted.length) {
      return weighted
    }
  }

  const pool = new Set<string>()

  for (const metas of itemMetasByName.values()) {
    for (const meta of metas) {
      if (meta.rarity !== rarity) {
        continue
      }

      if (meta.slot !== slot) {
        continue
      }

      if (meta.special) {
        continue
      }

      if (rarity === 'A' && slot === '饰' && isRandomAccessoryExcluded(meta.name)) {
        continue
      }

      pool.add(meta.name)
    }
  }

  return [...pool.values()]
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    .map((name) => ({ name, weight: 1 }))
}

function expandRandomOutputRules(
  rules: RecipeRule[],
  itemMetasByName: Map<string, ItemMeta[]>,
): RecipeRule[] {
  const expanded: RecipeRule[] = []

  for (const rule of rules) {
    const randomInfo = parseRandomOutputToken(rule.output)
    if (!randomInfo) {
      expanded.push(rule)
      continue
    }

    const pool = buildRandomOutputDistribution(randomInfo.rarity, randomInfo.slot, itemMetasByName)
    if (!pool.length) {
      expanded.push(rule)
      continue
    }

    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0)
    const hasWeights = pool.some((entry) => entry.weight !== 1)
    const optionList = pool.map((entry) => entry.name).join('、')
    const randomLabel = `${randomInfo.label}(${pool.length}选1${hasWeights ? ',权重' : ''})`
    const randomNote = `${randomLabel}【可选项:${optionList}】`
    const note = [rule.note || '', randomNote].filter(Boolean).join('；')

    pool.forEach((entry, index) => {
      const perChance = totalWeight > 0 ? rule.chance * (entry.weight / totalWeight) : rule.chance
      expanded.push({
        ...rule,
        id: `${rule.id}-rand-${index}`,
        output: entry.name,
        chance: perChance,
        note,
      })
    })
  }

  return expanded
}

function getBaseTokenCost(name: string, quantity = 1): number {
  const rarity = detectRarityLetter(name)
  let cost = rarity ? RARITY_COST[rarity] : DEFAULT_COST

  if (/随机/.test(name)) {
    cost += 2
  }

  if (/任意/.test(name)) {
    cost += 1
  }

  return cost * quantity
}

function cartesianSlots(slots: IngredientSlot[]): IngredientChoice[][] {
  return slots.reduce<IngredientChoice[][]>(
    (acc, slot) =>
      acc.flatMap((base) =>
        slot.alternatives.map((alternative) => [...base, alternative]),
      ),
    [[]],
  )
}

function routeSignature(route: RouteNode): string {
  if (!route.ruleId) {
    return `leaf:${route.item}`
  }

  const childSignature = route.ingredients
    .map((entry) => `${entry.quantity}x${entry.name}[${routeSignature(entry.route)}]`)
    .join('|')

  return `${route.item}|${childSignature}`
}

function compareBySuccessThenCost(a: RouteNode, b: RouteNode): number {
  if (b.successRate !== a.successRate) {
    return b.successRate - a.successRate
  }

  return a.cost - b.cost
}

function dedupeRoutes(routes: RouteNode[], compareRoutes: RouteComparator = compareBySuccessThenCost): RouteNode[] {
  const map = new Map<string, RouteNode>()

  for (const route of routes) {
    const key = routeSignature(route)
    const existing = map.get(key)

    if (!existing) {
      map.set(key, route)
      continue
    }

    if (compareRoutes(route, existing) < 0) {
      map.set(key, route)
    }
  }

  return [...map.values()].sort(compareRoutes)
}

function mainStepSignature(route: RouteNode): string {
  if (!route.ruleId) {
    return `leaf:${route.item}`
  }

  const ingredientSignature = route.ingredients
    .map((entry) => `${entry.quantity}x${entry.name}`)
    .join('|')

  return `${route.item}|${ingredientSignature}`
}

function collapseByMainStep(
  routes: RouteNode[],
  compareRoutes: RouteComparator = compareBySuccessThenCost,
): RouteNode[] {
  const map = new Map<string, RouteNode>()

  for (const route of routes) {
    const key = mainStepSignature(route)
    const existing = map.get(key)

    if (!existing) {
      map.set(key, route)
      continue
    }

    if (compareRoutes(route, existing) < 0) {
      map.set(key, route)
    }
  }

  return [...map.values()].sort(compareRoutes)
}

function countSteps(node: RouteNode): number {
  const childCount = node.ingredients.reduce((total, ingredient) => total + countSteps(ingredient.route), 0)
  return 1 + childCount
}

function collectSpecialNotes(node: RouteNode, bucket = new Set<string>()): Set<string> {
  if (node.note) {
    bucket.add(node.note)
  }

  for (const ingredient of node.ingredients) {
    collectSpecialNotes(ingredient.route, bucket)
  }

  return bucket
}

function mapSlot(category: ItemCategory, attribute: ItemAttribute): ItemSlot {
  if (category === '武器类') {
    return attribute === '智力' ? '法武' : '战武'
  }

  if (category === '衣服类') {
    return '衣'
  }

  if (category === '鞋子类') {
    return '鞋'
  }

  return '饰'
}

function buildBadge(meta: ItemMeta): string {
  if (meta.category === '武器类') {
    return `${meta.rarity}${meta.slot}`
  }

  return `${meta.rarity}${meta.attribute}`
}

function formatSpecialText(special: ItemMeta['special']): string | undefined {
  if (special === 'unique') {
    return '唯一'
  }

  if (special === 'scroll') {
    return '卷轴'
  }

  if (special === 'once') {
    return '一次'
  }

  return undefined
}

function parseItemCatalog(rawText: string): Map<string, ItemMeta[]> {
  const lines = rawText.split(/\r?\n/)
  const itemMap = new Map<string, ItemMeta[]>()

  let currentAttribute: Nullable<ItemAttribute> = null
  let currentRarity: Nullable<string> = null

  for (const originalLine of lines) {
    const line = originalLine.trim()
    if (!line) {
      continue
    }

    const rarityAttrMatch = line.match(/^([SGFEDCBA])\s*(力量|敏捷|智力|全能)[：:]$/)
    if (rarityAttrMatch) {
      currentRarity = rarityAttrMatch[1]
      currentAttribute = rarityAttrMatch[2] as ItemAttribute
      continue
    }

    const categoryMatch = line.match(/^(武器类|衣服类|鞋子类|饰品类)[:：](.+)$/)
    if (!categoryMatch || !currentAttribute || !currentRarity) {
      continue
    }

    const category = categoryMatch[1] as ItemCategory
    const values = categoryMatch[2]
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item !== '无')

    for (const name of values) {
      const { name: cleanedName, special } = extractSpecialMark(name)
      const normalizedName = cleanToken(cleanedName)
      if (!normalizedName) {
        continue
      }

      const meta: ItemMeta = {
        name: normalizedName,
        rarity: currentRarity,
        attribute: currentAttribute,
        category,
        slot: mapSlot(category, currentAttribute),
        badge: '',
        special,
      }

      meta.badge = buildBadge(meta)

      if (!itemMap.has(normalizedName)) {
        itemMap.set(normalizedName, [])
      }

      const existing = itemMap.get(normalizedName) || []
      const duplicate = existing.find(
        (entry) =>
          entry.rarity === meta.rarity &&
          entry.attribute === meta.attribute &&
          entry.category === meta.category &&
          entry.slot === meta.slot,
      )

      if (!duplicate) {
        existing.push(meta)
      }

      itemMap.set(normalizedName, existing)
    }
  }

  return itemMap
}

function normalizeTokenDisplay(token: string): string {
  const normalized = cleanToken(token)

  if (/任意/.test(normalized)) {
    const rarity = detectRarityLetter(normalized)
    if (rarity) {
      return `${rarity}任意`
    }

    return '任意'
  }

  return normalized
}

function parseQueryDescriptor(input: string): QueryDescriptor {
  const cleaned = cleanToken(input).replace(/^随机/, '')

  const pureRarityMatch = cleaned.match(/^([SGFEDCBA])$/)
  if (pureRarityMatch) {
    return {
      mode: 'any',
      rarity: pureRarityMatch[1],
      raw: `${pureRarityMatch[1]}任意`,
    }
  }

  const anyMatch = cleaned.match(/^([SGFEDCBA])任意$/)
  if (anyMatch) {
    return {
      mode: 'any',
      rarity: anyMatch[1],
      raw: cleaned,
    }
  }

  const attrMatch = cleaned.match(/^([SGFEDCBA])(力量|敏捷|智力|全能)$/)
  if (attrMatch) {
    return {
      mode: 'attribute',
      rarity: attrMatch[1],
      attribute: attrMatch[2] as ItemAttribute,
      raw: cleaned,
    }
  }

  const slotMatch = cleaned.match(/^([SGFEDCBA])(战武|法武|衣|鞋|饰|饰品)$/)
  if (slotMatch) {
    const rawSlot = slotMatch[2]
    const slot = rawSlot === '饰品' ? '饰' : (rawSlot as ItemSlot)
    return {
      mode: 'slot',
      rarity: slotMatch[1],
      slot,
      raw: cleaned,
    }
  }

  return {
    mode: 'unknown',
    raw: cleaned,
  }
}

function formatIngredientText(rule: RecipeRule): string {
  const firstCombination = rule.ingredientSlots
    .map((slot) => slot.alternatives[0])
    .filter(Boolean)

  return firstCombination
    .map((ingredient) => `${ingredient.quantity > 1 ? `${ingredient.quantity}x` : ''}${ingredient.name}`)
    .join(' + ')
}

function ingredientSlotsSignature(ingredientSlots: IngredientSlot[]): string {
  return ingredientSlots
    .map((slot) =>
      [...slot.alternatives]
        .sort((a, b) => {
          if (a.name !== b.name) {
            return a.name.localeCompare(b.name, 'zh-Hans-CN')
          }

          return a.quantity - b.quantity
        })
        .map((choice) => `${choice.quantity}x${choice.name}`)
        .join('/'),
    )
    .join('+')
}

function hasSpecialTagOutput(itemName: string, itemMetasByName: Map<string, ItemMeta[]>): boolean {
  const metas = itemMetasByName.get(itemName) || []
  return metas.some((meta) => !!meta.special)
}

function filterRandomSpecialOutputRules(
  rules: RecipeRule[],
  itemMetasByName: Map<string, ItemMeta[]>,
): RecipeRule[] {
  const grouped = new Map<string, RecipeRule[]>()

  for (const rule of rules) {
    const key = `${rule.source}|${ingredientSlotsSignature(rule.ingredientSlots)}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)?.push(rule)
  }

  const filtered: RecipeRule[] = []

  for (const groupRules of grouped.values()) {
    if (!groupRules.some((rule) => rule.randomOutput)) {
      filtered.push(...groupRules)
      continue
    }

    const kept = groupRules.filter((rule) => !hasSpecialTagOutput(rule.output, itemMetasByName))
    if (!kept.length) {
      continue
    }

    if (kept.length === groupRules.length) {
      filtered.push(...kept)
      continue
    }

    const totalChance = kept.reduce((sum, rule) => sum + Math.max(rule.chance, 0), 0)
    if (totalChance <= 0) {
      filtered.push(...kept)
      continue
    }

    filtered.push(
      ...kept.map((rule) => ({
        ...rule,
        chance: Number(((rule.chance / totalChance) * 100).toFixed(4)),
      })),
    )
  }

  return filtered
}

function dedupeRules(rules: RecipeRule[]): RecipeRule[] {
  const map = new Map<string, RecipeRule>()

  for (const rule of rules) {
    const key = [
      rule.output,
      ingredientSlotsSignature(rule.ingredientSlots),
      String(rule.chance),
      rule.exclusive ? '1' : '0',
    ].join('|')

    const existing = map.get(key)
    if (!existing) {
      map.set(key, rule)
      continue
    }

    if (!existing.note && rule.note) {
      map.set(key, {
        ...rule,
        id: existing.id,
      })
    }
  }

  return [...map.values()]
}

function buildEnumerator(
  rulesByOutput: Map<string, RecipeRule[]>,
  compareRoutes: RouteComparator,
) {
  function enumerateRoot(itemName: string): RouteNode[] {
    let expansionCount = 0

    function enumerate(item: string, stack: string[] = [], depth = 0): RouteNode[] {
      if (depth >= MAX_DEPTH || stack.includes(item) || expansionCount > MAX_EXPANSIONS) {
        return [
          {
            item,
            cost: getBaseTokenCost(item),
            successRate: 100,
            ruleId: null,
            ingredients: [],
          },
        ]
      }

      const rules = rulesByOutput.get(item) || []
      if (!rules.length) {
        return [
          {
            item,
            cost: getBaseTokenCost(item),
            successRate: 100,
            ruleId: null,
            ingredients: [],
          },
        ]
      }

      const nextStack = [...stack, item]
      const routeCandidates: RouteNode[] = []

      for (const rule of rules) {
        const ingredientCombinations = cartesianSlots(rule.ingredientSlots)

        for (const ingredientSet of ingredientCombinations) {
          let partialRoutes: RouteNode[] = [
            {
              item,
              ruleId: rule.id,
              ingredients: [],
              cost: STEP_COST,
              successRate: rule.chance,
              note: rule.note || undefined,
              exclusive: rule.exclusive,
            },
          ]

          for (const ingredient of ingredientSet) {
            expansionCount += 1
            const childRoutes = enumerate(ingredient.name, nextStack, depth + 1).slice(0, MAX_CHILD_ROUTES)
            const nextPartials: RouteNode[] = []

            for (const partial of partialRoutes) {
              for (const child of childRoutes) {
                nextPartials.push({
                  ...partial,
                  ingredients: [
                    ...partial.ingredients,
                    {
                      name: ingredient.name,
                      quantity: ingredient.quantity,
                      route: child,
                    },
                  ],
                  cost: partial.cost + child.cost * ingredient.quantity,
                  successRate: partial.successRate,
                })
              }
            }

            partialRoutes = nextPartials.slice(0, MAX_TOTAL_ROUTES)
            if (!partialRoutes.length) {
              break
            }
          }

          routeCandidates.push(...partialRoutes)
        }
      }

      if (!routeCandidates.length) {
        return [
          {
            item,
            cost: getBaseTokenCost(item),
            successRate: 100,
            ruleId: null,
            ingredients: [],
          },
        ]
      }

      return dedupeRoutes(routeCandidates, compareRoutes).slice(0, MAX_TOTAL_ROUTES)
    }

    return enumerate(itemName)
  }

  return enumerateRoot
}

export function createRecipeEngine(rawText: string): RecipeEngine {
  const formulaText = stripExplanationSection(rawText)
  const lines = formulaText.split(/\r?\n/)
  const itemMetasByName = parseItemCatalog(formulaText)

  const parsedRules = lines.flatMap((line, index) => parseFormulaLine(line, index + 1))
  const extraRules = EXTRA_FORMULA_LINES.flatMap((line, index) =>
    parseFormulaLine(line, lines.length + index + 1),
  )
  const expandedRules = expandRandomOutputRules([...parsedRules, ...extraRules], itemMetasByName)
  const filteredRandomRules = filterRandomSpecialOutputRules(expandedRules, itemMetasByName)
  const rules = dedupeRules(filteredRandomRules)

  const rulesByOutput = new Map<string, RecipeRule[]>()
  const outputNames = new Set<string>()
  const allNames = new Set<string>()

  for (const rule of rules) {
    if (!rulesByOutput.has(rule.output)) {
      rulesByOutput.set(rule.output, [])
    }

    rulesByOutput.get(rule.output)?.push(rule)
    outputNames.add(rule.output)
    allNames.add(rule.output)

    for (const slot of rule.ingredientSlots) {
      for (const ingredient of slot.alternatives) {
        allNames.add(ingredient.name)
      }
    }
  }

  for (const itemName of itemMetasByName.keys()) {
    allNames.add(itemName)
  }

  function getTokenRarityCost(token: string): Nullable<number> {
    const normalized = normalizeItemName(token)
    const directRarity = detectRarityLetter(normalized)

    if (directRarity && RARITY_COST[directRarity]) {
      return RARITY_COST[directRarity]
    }

    const metas = itemMetasByName.get(normalized) || []
    if (!metas.length) {
      return null
    }

    const best = metas.reduce((max, meta) => Math.max(max, RARITY_COST[meta.rarity] || 0), 0)
    return best > 0 ? best : null
  }

  function isDowngradeRoute(route: RouteNode): boolean {
    if (!route.ruleId) {
      return false
    }

    const outputCost = getTokenRarityCost(route.item)
    if (outputCost === null) {
      return false
    }

    return route.ingredients.some((ingredient) => {
      const ingredientCost = getTokenRarityCost(ingredient.name)
      return ingredientCost !== null && ingredientCost > outputCost
    })
  }

  // 计算路线类型：-1=降级，0=平级，1=升级
  function getRouteUpgradeLevel(route: RouteNode): number {
    if (!route.ruleId) {
      return 0
    }

    const outputCost = getTokenRarityCost(route.item)
    if (outputCost === null) {
      return 0
    }

    let maxIngredientCost = 0
    for (const ingredient of route.ingredients) {
      const cost = getTokenRarityCost(ingredient.name)
      if (cost !== null && cost > maxIngredientCost) {
        maxIngredientCost = cost
      }
    }

    if (maxIngredientCost > outputCost) {
      return -1 // 降级
    } else if (maxIngredientCost < outputCost) {
      return 1 // 升级
    }
    return 0 // 平级
  }

  // 计算路线产出的稀缺度得分
  function getRouteScarcityScore(route: RouteNode): number {
    const outputCost = getTokenRarityCost(route.item)
    if (outputCost === null) {
      return 0
    }

    // 根据cost反推稀有度等级
    for (const [rarity, cost] of Object.entries(RARITY_COST)) {
      if (cost === outputCost) {
        return RARITY_SCARCITY[rarity] || 0
      }
    }

    return 0
  }

  function compareRoutePriority(a: RouteNode, b: RouteNode): number {
    // 1. 优先比较升级/平级/降级（升级>平级>降级）
    const upgradeA = getRouteUpgradeLevel(a)
    const upgradeB = getRouteUpgradeLevel(b)
    if (upgradeA !== upgradeB) {
      return upgradeB - upgradeA // 升级(1)优先于平级(0)优先于降级(-1)
    }

    // 2. 比较稀缺度（S>>>>A>B>>C=D=E=F）
    const scarcityA = getRouteScarcityScore(a)
    const scarcityB = getRouteScarcityScore(b)
    if (scarcityA !== scarcityB) {
      return scarcityB - scarcityA // 高稀缺度优先
    }

    // 3. 比较成功率和成本
    return compareBySuccessThenCost(a, b)
  }

  function isDowngradeRule(rule: RecipeRule): boolean {
    const outputCost = getTokenRarityCost(rule.output)
    if (outputCost === null) {
      return false
    }

    return rule.ingredientSlots.some((slot) =>
      slot.alternatives.some((alternative) => {
        const ingredientCost = getTokenRarityCost(alternative.name)
        return ingredientCost !== null && ingredientCost > outputCost
      }),
    )
  }

  const enumerate = buildEnumerator(rulesByOutput, compareRoutePriority)

  function getItemMetas(itemName: string): ItemMeta[] {
    const normalized = normalizeItemName(itemName)
    const list = itemMetasByName.get(normalized) || []
    return [...list].sort((a, b) => {
      if (a.rarity !== b.rarity) {
        return (RARITY_COST[b.rarity] || 0) - (RARITY_COST[a.rarity] || 0)
      }

      return a.badge.localeCompare(b.badge, 'zh-Hans-CN')
    })
  }

  function queryItems(input: string): ItemQueryResult {
    const normalized = normalizeItemName(input)
    const concrete = getItemMetas(normalized)

    if (concrete.length) {
      return {
        descriptor: {
          mode: 'unknown',
          raw: normalized,
        },
        items: concrete,
      }
    }

    const descriptor = parseQueryDescriptor(normalized)
    if (descriptor.mode === 'unknown' || !descriptor.rarity) {
      return {
        descriptor,
        items: [],
      }
    }

    if (descriptor.mode === 'any') {
      return {
        descriptor,
        items: [],
      }
    }

    const result: ItemMeta[] = []
    for (const metas of itemMetasByName.values()) {
      for (const meta of metas) {
        if (meta.rarity !== descriptor.rarity) {
          continue
        }

        if (descriptor.mode === 'attribute' && descriptor.attribute && meta.attribute !== descriptor.attribute) {
          continue
        }

        if (descriptor.mode === 'slot' && descriptor.slot && meta.slot !== descriptor.slot) {
          continue
        }

        result.push(meta)
      }
    }

    const dedup = new Map<string, ItemMeta>()
    for (const item of result) {
      if (!dedup.has(item.name)) {
        dedup.set(item.name, item)
      }
    }

    const items = [...dedup.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))

    return {
      descriptor,
      items,
    }
  }

  function getFormulaInfos(itemName: string): FormulaInfo[] {
    const normalized = normalizeItemName(itemName)
    const ruleList = rulesByOutput.get(normalized) || []

    const sortedRules = [...ruleList].sort((a, b) => {
      const downgradeA = isDowngradeRule(a)
      const downgradeB = isDowngradeRule(b)

      if (downgradeA !== downgradeB) {
        return downgradeA ? 1 : -1
      }

      if (b.chance !== a.chance) {
        return b.chance - a.chance
      }

      if (a.exclusive !== b.exclusive) {
        return a.exclusive ? -1 : 1
      }

      return formatIngredientText(a).localeCompare(formatIngredientText(b), 'zh-Hans-CN')
    })

    const dedup = new Map<string, FormulaInfo>()

    for (const rule of sortedRules) {
      const info: FormulaInfo = {
        output: rule.output,
        chance: rule.chance,
        note: rule.note,
        exclusive: rule.exclusive,
        ingredientText: formatIngredientText(rule),
      }

      const key = [
        info.output,
        info.ingredientText,
        String(info.chance),
        info.exclusive ? '1' : '0',
        info.note || '',
      ].join('|')

      if (!dedup.has(key)) {
        dedup.set(key, info)
      }
    }

    return [...dedup.values()]
  }

  function describeToken(token: string): TokenView {
    const normalized = normalizeItemName(token)

    const pureRarity = normalized.match(/^([SGFEDCBA])$/)
    if (pureRarity) {
      return {
        label: `${pureRarity[1]}任意`,
        kind: 'any',
        clickable: false,
      }
    }

    const concreteMetas = getItemMetas(normalized)
    if (concreteMetas.length) {
      const primary = concreteMetas[0]
      return {
        label: normalized,
        kind: 'item',
        clickable: true,
        queryToken: normalized,
        badgeText: primary.rarity === 'G' ? undefined : primary.badge,
        badgeRarity: primary.rarity === 'G' ? undefined : primary.rarity,
        specialText: formatSpecialText(primary.special),
      }
    }

    const descriptor = parseQueryDescriptor(normalized)
    if (descriptor.mode === 'any' && descriptor.rarity) {
      return {
        label: `${descriptor.rarity}任意`,
        kind: 'any',
        clickable: false,
      }
    }

    if (descriptor.mode === 'attribute' || descriptor.mode === 'slot') {
      return {
        label: descriptor.raw,
        kind: 'generic',
        clickable: true,
        queryToken: descriptor.raw,
      }
    }

    if (/任意/.test(normalized)) {
      return {
        label: normalizeTokenDisplay(normalized),
        kind: 'any',
        clickable: false,
      }
    }

    return {
      label: normalized,
      kind: 'unknown',
      clickable: false,
    }
  }

  return {
    ruleCount: rules.length,
    outputList: [...outputNames].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    allNames: [...allNames].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    itemNames: [...itemMetasByName.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    findRoutes(target: string): RecipeSearchResult {
      const normalizedTarget = normalizeItemName(target)
      if (!normalizedTarget) {
        return { routes: [], truncated: false }
      }

      const routes = enumerate(normalizedTarget)
      const sorted = collapseByMainStep(
        dedupeRoutes(routes, compareRoutePriority),
        compareRoutePriority,
      ).slice(0, MAX_TOTAL_ROUTES)

      const payload: DisplayRoute[] = sorted.map((route, index) => {
        const notes = collectSpecialNotes(route)

        if (isDowngradeRoute(route)) {
          notes.add('降级路线：存在高于目标品级的材料，优先级已下调。')
        }

        return {
          id: `${normalizedTarget}-${index + 1}`,
          item: normalizedTarget,
          cost: route.cost,
          steps: countSteps(route),
          successRate: route.successRate,
          specialNotes: [...notes],
          tree: route,
        }
      })

      payload.sort((a, b) => compareRoutePriority(a.tree, b.tree))

      return {
        routes: payload,
        truncated: sorted.length >= MAX_TOTAL_ROUTES,
      }
    },
    describeToken,
    getItemMetas,
    getFormulaInfos,
    queryItems,
  }
}
