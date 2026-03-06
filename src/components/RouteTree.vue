<script lang="ts">
import { defineComponent, type PropType } from 'vue'

interface TreeNode {
  item: string
  ruleId: string | null
  successRate?: number
  ingredients: Array<{
    name: string
    quantity: number
    route: TreeNode
  }>
}

interface TokenView {
  kind: string
  label: string
  clickable: boolean
  queryToken?: string
  badgeText?: string
  badgeRarity?: string
  specialText?: string
}

export default defineComponent({
  name: 'RouteTree',
  props: {
    node: {
      type: Object as PropType<TreeNode>,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
    expandChildren: {
      type: Boolean,
      default: true,
    },
    resolveToken: {
      type: Function as PropType<(token: string) => any>,
      required: true,
    },
    onTokenClick: {
      type: Function as PropType<(token: string, view: any) => void>,
      required: true,
    },
  },
  methods: {
    getTokenView(token: string): TokenView {
      return this.resolveToken(token)
    },
    handleTokenClick(token: string) {
      const view = this.getTokenView(token)
      if (!view.clickable) {
        return
      }
      this.onTokenClick(token, view)
    },
    formatRate(rate?: number): string {
      if (typeof rate !== 'number') {
        return ''
      }

      if (Number.isInteger(rate)) {
        return `${rate}%`
      }

      return `${rate.toFixed(2)}%`
    },
    getSuccessRateClass(rate?: number): string {
      if (typeof rate !== 'number') {
        return ''
      }

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
    },
  },
})
</script>

<template>
  <div class="tree-node" :style="{ marginLeft: `${Math.min(level, 8) * 12}px` }">
    <div class="tree-row">
      <button
        v-if="getTokenView(node.item).clickable"
        type="button"
        :class="[
          'tree-item',
          {
            'has-corner-badge': !!getTokenView(node.item).badgeText,
            'has-special-badge': !!getTokenView(node.item).specialText,
          },
          getTokenView(node.item).badgeRarity ? `rarity-text-${getTokenView(node.item).badgeRarity}` : '',
        ]"
        @click="handleTokenClick(node.item)"
      >
        {{ getTokenView(node.item).label }}
        <span
          v-if="getTokenView(node.item).badgeText && getTokenView(node.item).badgeRarity"
          :class="[
            'item-badge',
            'corner',
            getTokenView(node.item).badgeRarity ? `rarity-text-${getTokenView(node.item).badgeRarity}` : '',
          ]"
        >
          {{ getTokenView(node.item).badgeText }}
        </span>
        <span
          v-if="getTokenView(node.item).specialText"
          :class="[
            'item-badge',
            'corner-bottom',
            getTokenView(node.item).badgeRarity ? `rarity-text-${getTokenView(node.item).badgeRarity}` : '',
          ]"
        >
          {{ getTokenView(node.item).specialText }}
        </span>
      </button>
      <span
        v-else
        :class="[
          'tree-item',
          'is-static',
          {
            'has-corner-badge': !!getTokenView(node.item).badgeText,
            'has-special-badge': !!getTokenView(node.item).specialText,
          },
          getTokenView(node.item).badgeRarity ? `rarity-text-${getTokenView(node.item).badgeRarity}` : '',
        ]"
      >
        {{ getTokenView(node.item).label }}
        <span
          v-if="getTokenView(node.item).badgeText && getTokenView(node.item).badgeRarity"
          :class="[
            'item-badge',
            'corner',
            getTokenView(node.item).badgeRarity ? `rarity-text-${getTokenView(node.item).badgeRarity}` : '',
          ]"
        >
          {{ getTokenView(node.item).badgeText }}
        </span>
        <span
          v-if="getTokenView(node.item).specialText"
          :class="[
            'item-badge',
            'corner-bottom',
            getTokenView(node.item).badgeRarity ? `rarity-text-${getTokenView(node.item).badgeRarity}` : '',
          ]"
        >
          {{ getTokenView(node.item).specialText }}
        </span>
      </span>

      <template v-if="node.ruleId">
        <span class="tree-link">=</span>
        <template v-for="(ingredient, index) in node.ingredients" :key="`${ingredient.name}-${index}-${level}`">
          <button
            v-if="getTokenView(ingredient.name).clickable"
            type="button"
            :class="[
              'tree-item',
              'is-ingredient',
              {
                'has-corner-badge': !!getTokenView(ingredient.name).badgeText,
                'has-special-badge': !!getTokenView(ingredient.name).specialText,
              },
              getTokenView(ingredient.name).badgeRarity
                ? `rarity-text-${getTokenView(ingredient.name).badgeRarity}`
                : '',
            ]"
            @click="handleTokenClick(ingredient.name)"
          >
            {{ ingredient.quantity > 1 ? `${ingredient.quantity}x` : '' }}{{ getTokenView(ingredient.name).label }}
            <span
              v-if="getTokenView(ingredient.name).badgeText && getTokenView(ingredient.name).badgeRarity"
              :class="[
                'item-badge',
                'corner',
                getTokenView(ingredient.name).badgeRarity
                  ? `rarity-text-${getTokenView(ingredient.name).badgeRarity}`
                  : '',
              ]"
            >
              {{ getTokenView(ingredient.name).badgeText }}
            </span>
            <span
              v-if="getTokenView(ingredient.name).specialText"
              :class="[
                'item-badge',
                'corner-bottom',
                getTokenView(ingredient.name).badgeRarity
                  ? `rarity-text-${getTokenView(ingredient.name).badgeRarity}`
                  : '',
              ]"
            >
              {{ getTokenView(ingredient.name).specialText }}
            </span>
          </button>
          <span
            v-else
            :class="[
              'tree-item',
              'is-ingredient',
              'is-static',
              {
                'has-corner-badge': !!getTokenView(ingredient.name).badgeText,
                'has-special-badge': !!getTokenView(ingredient.name).specialText,
              },
              getTokenView(ingredient.name).badgeRarity
                ? `rarity-text-${getTokenView(ingredient.name).badgeRarity}`
                : '',
            ]"
          >
            {{ ingredient.quantity > 1 ? `${ingredient.quantity}x` : '' }}{{ getTokenView(ingredient.name).label }}
            <span
              v-if="getTokenView(ingredient.name).badgeText && getTokenView(ingredient.name).badgeRarity"
              :class="[
                'item-badge',
                'corner',
                getTokenView(ingredient.name).badgeRarity
                  ? `rarity-text-${getTokenView(ingredient.name).badgeRarity}`
                  : '',
              ]"
            >
              {{ getTokenView(ingredient.name).badgeText }}
            </span>
            <span
              v-if="getTokenView(ingredient.name).specialText"
              :class="[
                'item-badge',
                'corner-bottom',
                getTokenView(ingredient.name).badgeRarity
                  ? `rarity-text-${getTokenView(ingredient.name).badgeRarity}`
                  : '',
              ]"
            >
              {{ getTokenView(ingredient.name).specialText }}
            </span>
          </span>
          <span v-if="index !== node.ingredients.length - 1" class="tree-plus">+</span>
        </template>

        <span
          v-if="typeof node.successRate === 'number'"
          :class="['formula-rate', getSuccessRateClass(node.successRate)]"
        >
          {{ formatRate(node.successRate) }}
        </span>
      </template>

      <span v-else class="tree-leaf">基础</span>
    </div>

    <template v-if="expandChildren">
      <RouteTree
        v-for="(ingredient, idx) in node.ingredients"
        :key="`${ingredient.route.item}-${idx}-${level}`"
        :node="ingredient.route"
        :level="level + 1"
        :resolve-token="resolveToken"
        :on-token-click="onTokenClick"
        :expand-children="expandChildren"
      />
    </template>
  </div>
</template>
