<script setup lang="ts">
import { computed, ref } from 'vue'
import formulasText from './data/formulas'
import RouteTree from './components/RouteTree.vue'
import { createRecipeEngine } from './utils/recipeEngine'

const recipeEngine = createRecipeEngine(formulasText)
type RouteResult = ReturnType<typeof recipeEngine.findRoutes>['routes'][number]
type ItemMeta = ReturnType<typeof recipeEngine.getItemMetas>[number]
type FormulaInfo = ReturnType<typeof recipeEngine.getFormulaInfos>[number]
type TokenView = ReturnType<typeof recipeEngine.describeToken>
type QueryTab = 'synthesis' | 'attribute' | 'items'
type SynthesisSource = 'direct' | 'drill' | 'back'

const targetItem = ref('')
const searchedKeyword = ref('')
const activeTab = ref<QueryTab>('synthesis')

const routeResults = ref<RouteResult[]>([])
const truncated = ref(false)
const synthesisHistory = ref<string[]>([])

const attributeItems = ref<ItemMeta[]>([])
const attributeFormulas = ref<FormulaInfo[]>([])

const queriedItems = ref<ItemMeta[]>([])
const itemQueryTip = ref('')

const modalOpen = ref(false)
const modalTitle = ref('')
const modalTip = ref('')
const modalItems = ref<ItemMeta[]>([])

// 帝都答题相关
type DiduQuestion = { id: number; question: string; answer: string }
type DiduDifficulty = 'normal' | 'hard' | 'nightmare'
type DiduQuestionsData = Record<DiduDifficulty, DiduQuestion[]>

const diduModalOpen = ref(false)
const diduActiveDifficulty = ref<DiduDifficulty>('normal')
const diduQuestions = ref<DiduQuestionsData>({ normal: [], hard: [], nightmare: [] })

const canGoBack = computed(
  () => activeTab.value === 'synthesis' && synthesisHistory.value.length > 0,
)

// 高频装备列表
const HIGH_FREQUENCY_ITEMS = [
  '梵天纹章',
  '天皇鸡冠',
  '古代神铠',
  '阿修罗',
  '雾幻云珠',
  '谛听天镯',
  '千棱幻玉',
  '银河幻星鞋',
  '炽凰天衣',
  '北斗炼日印',
]

const suggestions = computed(() => {
  const keyword = targetItem.value.trim()
  if (!keyword) {
    // 没有输入时，显示高频装备
    return HIGH_FREQUENCY_ITEMS
  }

  return recipeEngine.allNames
    .filter((name) => name.includes(keyword))
    .slice(0, 16)
})

const fuzzyMatches = computed(() => {
  if (activeTab.value !== 'synthesis' || !searchedKeyword.value || routeResults.value.length > 0) {
    return []
  }

  return recipeEngine.outputList
    .filter((name) => name.includes(searchedKeyword.value))
    .slice(0, 10)
})

const attributeSuggestions = computed(() => {
  if (activeTab.value !== 'attribute' || attributeItems.value.length > 0) {
    return []
  }

  return recipeEngine.itemNames
    .filter((name) => name.includes(searchedKeyword.value))
    .slice(0, 10)
})

function formatRate(rate: number): string {
  if (Number.isInteger(rate)) {
    return `${rate}%`
  }
  return `${rate.toFixed(2)}%`
}

function getSuccessRateClass(rate: number): string {
  if (rate >= 100) {
    return 'rate-100'
  }
  if (rate >= 75) {
    return 'rate-high'
  }
  if (rate >= 50) {
    return 'rate-mid'
  }
  if (rate >= 25) {
    return 'rate-low'
  }
  return 'rate-very-low'
}

function isDowngradeWarning(note: string): boolean {
  return note.includes('降级路线')
}

function resetModeData() {
  routeResults.value = []
  truncated.value = false
  attributeItems.value = []
  attributeFormulas.value = []
  queriedItems.value = []
  itemQueryTip.value = ''
}

function runSynthesis(keyword = targetItem.value, source: SynthesisSource = 'direct') {
  const keywordText = keyword.trim()

  if (source === 'direct') {
    synthesisHistory.value = []
  }

  if (
    source === 'drill'
    && searchedKeyword.value
    && activeTab.value === 'synthesis'
    && searchedKeyword.value !== keywordText
  ) {
    synthesisHistory.value.push(searchedKeyword.value)
  }

  activeTab.value = 'synthesis'
  searchedKeyword.value = keywordText

  resetModeData()

  if (!keywordText) {
    return
  }

  const result = recipeEngine.findRoutes(keywordText)
  routeResults.value = result.routes
  truncated.value = result.truncated
}

function runAttributeQuery(keyword = targetItem.value) {
  const keywordText = keyword.trim()
  activeTab.value = 'attribute'
  searchedKeyword.value = keyword

  resetModeData()

  if (!keywordText) {
    return
  }

  attributeItems.value = recipeEngine.getItemMetas(keywordText)
  attributeFormulas.value = recipeEngine.getFormulaInfos(keywordText)
  searchedKeyword.value = keywordText
}

function runItemQuery(keyword = targetItem.value) {
  const keywordText = keyword.trim()
  activeTab.value = 'items'
  searchedKeyword.value = keywordText

  resetModeData()

  if (!keywordText) {
    return
  }

  const result = recipeEngine.queryItems(keywordText)
  queriedItems.value = result.items

  if (result.descriptor.mode === 'any' && result.descriptor.rarity) {
    itemQueryTip.value = `${result.descriptor.rarity}任意属于无要求材料，不限制具体物品。`
  } else if (!result.items.length) {
    itemQueryTip.value = '未匹配到对应物品。可尝试输入例如：A力量、S战武、B鞋、C法武。'
  } else {
    itemQueryTip.value = `共匹配 ${result.items.length} 个物品。`
  }
}

function goBackSynthesis() {
  const previous = synthesisHistory.value.pop()
  if (!previous) {
    return
  }
  targetItem.value = previous
  runSynthesis(previous, 'back')
}

function resolveToken(token: string): TokenView {
  return recipeEngine.describeToken(token)
}

function openGenericModal(token: string) {
  const result = recipeEngine.queryItems(token)
  modalTitle.value = `${token} 可选物品`
  modalItems.value = result.items

  if (result.descriptor.mode === 'any' && result.descriptor.rarity) {
    modalTip.value = `${result.descriptor.rarity}任意属于无要求材料，不限制具体物品。`
  } else {
    modalTip.value = result.items.length ? `共 ${result.items.length} 件` : '暂无对应具体名称物品。'
  }

  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function handleTreeTokenClick(token: string, view: TokenView) {
  if (view.kind === 'item') {
    targetItem.value = token
    runSynthesis(token, 'drill')
    return
  }

  if (view.kind === 'generic' && view.queryToken) {
    openGenericModal(view.queryToken)
  }
}

function pickModalItem(name: string) {
  closeModal()
  targetItem.value = name
  runSynthesis(name, 'drill')
}

function quickFill(item: string) {
  targetItem.value = item

  if (activeTab.value === 'attribute') {
    runAttributeQuery(item)
    return
  }

  if (activeTab.value === 'items') {
    runItemQuery(item)
    return
  }

  runSynthesis(item, 'direct')
}

function clearInput() {
  targetItem.value = ''
}

function onSubmit() {
  if (activeTab.value === 'attribute') {
    runAttributeQuery()
    return
  }

  if (activeTab.value === 'items') {
    runItemQuery()
    return
  }

  runSynthesis(targetItem.value, 'direct')
}

// 帝都答题相关函数
function parseDiduQuestions(mdText: string): DiduQuestionsData {
  const result: DiduQuestionsData = { normal: [], hard: [], nightmare: [] }
  const lines = mdText.split('\n')
  let currentDifficulty: DiduDifficulty | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '# 普通') {
      currentDifficulty = 'normal'
      continue
    } else if (trimmed === '## 困难') {
      currentDifficulty = 'hard'
      continue
    } else if (trimmed === '## 噩梦') {
      currentDifficulty = 'nightmare'
      continue
    }

    if (!currentDifficulty || !trimmed) continue

    // 匹配题号行，格式：数字[空格]问题 答案
    // 数字后的空格是可选的，最后的空格分割问题和答案
    const match = trimmed.match(/^(\d+)\s*(.+?)\s+(.+)$/)
    if (match) {
      const id = parseInt(match[1])
      const question = match[2]
      const answer = match[3]

      result[currentDifficulty].push({
        id,
        question,
        answer,
      })
    }
  }

  return result
}

async function initializeDiduQuestions() {
  try {
    const mdText = await fetch('./帝都问题答案.md').then(r => r.text())
    diduQuestions.value = parseDiduQuestions(mdText)
  } catch (error) {
    console.error('Failed to load didu questions:', error)
  }
}

function openDiduModal() {
  // 如果还没加载过题目，先加载
  if (diduQuestions.value.normal.length === 0) {
    initializeDiduQuestions().then(() => {
      diduModalOpen.value = true
    })
  } else {
    diduModalOpen.value = true
  }
}

function closeDiduModal() {
  diduModalOpen.value = false
}

// 初始化时预加载帝都问题答案
initializeDiduQuestions()
</script>

<template>
  <main class="page">
    <section class="panel">
      <header class="hero">
        <div class="hero-content">
          <h1>西方世界的劫难3 · 炼化公式查询</h1>
          <p>支持查炼化、查属性、查物品；具体物品可下钻，泛化条件可弹窗查看对应物品。</p>
        </div>
        <button type="button" class="didu-quiz-btn" @click="openDiduModal" title="帝都答题">
          帝都答题
        </button>
      </header>

      <form class="search-bar" @submit.prevent="onSubmit">
        <div class="search-input-wrap">
          <input
            v-model="targetItem"
            type="text"
            placeholder="例如：教皇禁袍 / A力量 / S战武"
            autocomplete="off"
          />
          <button v-if="targetItem" type="button" class="clear-input" @click="clearInput">
            ×
          </button>
        </div>

        <button type="button" :class="['mode-btn', { active: activeTab === 'synthesis' }]" @click="runSynthesis()">
          查炼化
        </button>
        <button type="button" :class="['mode-btn', { active: activeTab === 'attribute' }]" @click="runAttributeQuery()">
          查属性
        </button>
        <button type="button" :class="['mode-btn', { active: activeTab === 'items' }]" @click="runItemQuery()">
          查物品
        </button>
      </form>

      <div class="top-actions">
        <button
          type="button"
          class="back-btn"
          :disabled="!canGoBack"
          @click="goBackSynthesis"
        >
          返回上一步
        </button>
      </div>

      <div v-if="suggestions.length" class="suggestions">
        <span class="label">快速选择：</span>
        <button
          v-for="item in suggestions"
          :key="item"
          type="button"
          class="chip"
          @click="quickFill(item)"
        >
          {{ item }}
        </button>
      </div>

      <section class="meta">
        <span>已解析公式：{{ recipeEngine.ruleCount }}</span>
        <span>可查询目标：{{ recipeEngine.outputList.length }}</span>
        <span>已收录物品：{{ recipeEngine.itemNames.length }}</span>
      </section>

      <section v-if="searchedKeyword && activeTab === 'synthesis'" class="result-block">
        <div class="result-title">
          <h2>查询结果：{{ searchedKeyword }}</h2>
          <span v-if="routeResults.length">共 {{ routeResults.length }} 条炼化路线</span>
        </div>

        <p v-if="truncated" class="warn">
          炼化路线数量过多，已按代价排序后截取前 {{ routeResults.length }} 条。
        </p>

        <p v-if="!routeResults.length" class="empty">未找到该目标的可用炼化路线。</p>

        <div v-if="!routeResults.length && fuzzyMatches.length" class="fuzzy">
          <span>你可能想查：</span>
          <button
            v-for="item in fuzzyMatches"
            :key="`fuzzy-${item}`"
            type="button"
            class="chip"
            @click="quickFill(item)"
          >
            {{ item }}
          </button>
        </div>

        <article v-for="(route, index) in routeResults" :key="route.id" class="route-card synthesis-route-card">
          <RouteTree
            :node="route.tree"
            :resolve-token="resolveToken"
            :on-token-click="handleTreeTokenClick"
            :expand-children="false"
          />
          <header>
            <h3 class="synthesis-route-title">炼化路线 {{ index + 1 }}</h3>
            <div class="tags">
              <span>代价：{{ route.cost }}</span>
              <span>步骤：{{ route.steps }}</span>
            </div>
          </header>
          <ul v-if="route.specialNotes.length" class="note-list">
            <li
              v-for="note in route.specialNotes"
              :key="note"
              :class="{ 'downgrade-note': isDowngradeWarning(note) }"
            >
              <span v-if="isDowngradeWarning(note)" class="downgrade-note-badge">⚠ 降级</span>
              {{ note }}
            </li>
          </ul>
        </article>
      </section>

      <section v-if="searchedKeyword && activeTab === 'attribute'" class="result-block">
        <div class="result-title">
          <h2>属性查询：{{ searchedKeyword }}</h2>
        </div>

        <p v-if="!attributeItems.length" class="empty">未找到该物品属性。</p>

        <div v-if="!attributeItems.length && attributeSuggestions.length" class="fuzzy">
          <span>你可能想查：</span>
          <button
            v-for="item in attributeSuggestions"
            :key="`attr-${item}`"
            type="button"
            class="chip"
            @click="quickFill(item)"
          >
            {{ item }}
          </button>
        </div>

        <article v-if="attributeItems.length" class="route-card">
          <header>
            <h3>{{ searchedKeyword }}</h3>
            <div class="tags">
              <span>属性记录：{{ attributeItems.length }}</span>
            </div>
          </header>

          <div class="meta-grid">
            <div v-for="meta in attributeItems" :key="`${meta.name}-${meta.badge}`" class="meta-chip">
              <span :class="['item-badge inline', `rarity-${meta.rarity}`]">{{ meta.badge }}</span>
              <span>{{ meta.category }} / {{ meta.attribute }}</span>
            </div>
          </div>

          <div v-if="attributeFormulas.length" class="formula-info">
            <h4>相关炼化（100%优先）</h4>
            <ul class="note-list">
              <li v-for="(info, idx) in attributeFormulas" :key="`${info.output}-${idx}`">
                {{ info.output }} = {{ info.ingredientText }}
                <span :class="['formula-rate-inline', getSuccessRateClass(info.chance)]">{{ formatRate(info.chance) }}</span>
                <span v-if="info.exclusive" class="exclusive-tag">专属</span>
                <span v-if="info.note"> · {{ info.note }}</span>
              </li>
            </ul>
          </div>
        </article>
      </section>

      <section v-if="searchedKeyword && activeTab === 'items'" class="result-block">
        <div class="result-title">
          <h2>物品反查：{{ searchedKeyword }}</h2>
          <span v-if="queriedItems.length">共 {{ queriedItems.length }} 件</span>
        </div>

        <p class="empty">{{ itemQueryTip }}</p>

        <div v-if="queriedItems.length" class="item-list">
          <button
            v-for="item in queriedItems"
            :key="`${item.name}-${item.badge}`"
            type="button"
            :class="[
              'item-pill',
              { 'has-corner-badge': item.rarity !== 'G' },
              item.rarity !== 'G' ? `rarity-text-${item.rarity}` : '',
            ]"
            @click="quickFill(item.name)"
          >
            <span
              v-if="item.rarity !== 'G'"
              :class="['item-badge', 'corner', `rarity-text-${item.rarity}`]"
            >
              {{ item.badge }}
            </span>
            {{ item.name }}
          </button>
        </div>
      </section>
    </section>

    <div v-if="modalOpen" class="modal-mask" @click.self="closeModal">
      <section class="modal-panel">
        <header>
          <h3>{{ modalTitle }}</h3>
          <button type="button" class="clear-input" @click="closeModal">×</button>
        </header>
        <p class="empty">{{ modalTip }}</p>
        <div v-if="modalItems.length" class="item-list">
          <button
            v-for="item in modalItems"
            :key="`modal-${item.name}-${item.badge}`"
            type="button"
            :class="[
              'item-pill',
              { 'has-corner-badge': item.rarity !== 'G' },
              item.rarity !== 'G' ? `rarity-text-${item.rarity}` : '',
            ]"
            @click="pickModalItem(item.name)"
          >
            <span
              v-if="item.rarity !== 'G'"
              :class="['item-badge', 'corner', `rarity-text-${item.rarity}`]"
            >
              {{ item.badge }}
            </span>
            {{ item.name }}
          </button>
        </div>
      </section>
    </div>

    <!-- 帝都答题弹窗 -->
    <div v-if="diduModalOpen" class="modal-mask" @click.self="closeDiduModal">
      <section class="didu-modal-panel">
        <header class="didu-modal-header">
          <h3>帝都答题</h3>
          <button type="button" class="clear-input" @click="closeDiduModal">×</button>
        </header>

        <div class="difficulty-tabs">
          <button
            v-for="difficulty in ['normal', 'hard', 'nightmare'] as const"
            :key="difficulty"
            type="button"
            :class="['difficulty-tab', { active: diduActiveDifficulty === difficulty }]"
            @click="diduActiveDifficulty = difficulty"
          >
            {{ difficulty === 'normal' ? '普通' : difficulty === 'hard' ? '困难' : '噩梦' }}
          </button>
        </div>

        <div class="didu-questions-container">
          <div
            v-if="!diduQuestions[diduActiveDifficulty].length"
            class="empty-state"
          >
            加载中...
          </div>
          <div
            v-for="item in diduQuestions[diduActiveDifficulty]"
            :key="`${diduActiveDifficulty}-${item.id}`"
            class="didu-question-card"
          >
            <span class="question-num">{{ item.id }}.</span>
            <span class="question-text">{{ item.question }}</span>
            <span class="answer-highlight">{{ item.answer }}</span>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
