<template>
  <div class="vue-waterfall" :style="style">
    <slot></slot>
  </div>
</template>

<style>
.vue-waterfall {
  position: relative;
  /*overflow: hidden; cause clientWidth = 0 in IE if height not bigger than 0 */
}
</style>

<script>

export default {
  props: {
    autoResize: {
      default: true
    },
    interval: {
      default: 200,
      validator: (val) => val >= 0
    },
    align: {
      default: 'left',
      validator: (val) => ~['left', 'right', 'center'].indexOf(val)
    },
    line: {
      default: 'v',
      validator: (val) => ~['v', 'h'].indexOf(val)
    },
    lineGap: {
      required: true,
      validator: (val) => val >= 0
    },
    minLineGap: {
      validator: (val) => val >= 0
    },
    maxLineGap: {
      validator: (val) => val >= 0
    },
    singleMaxWidth: {
      validator: (val) => val >= 0
    },
    fixedHeight: {
      default: false
    }
  },
  data: () => ({
    style: {
      height: ''
    }
  }),
  methods: {
    autoResizeHandler: autoResizeHandler,
    reflowHandler: getReflowHandler(),
    reflow: reflow
  },
  events: {
    'wf-reflow': function () {
      this.reflowHandler()
    }
  },
  created () {
    this.virtualStyles = []
  },
  ready () {
    this.autoResizeHandler()
    this.$watch('autoResize', this.autoResizeHandler)
    this.$watch(() => (
      this.align,
      this.line,
      this.lineGap,
      this.minLineGap,
      this.maxLineGap,
      this.singleMaxWidth,
      this.fixedHeight
    ), this.reflowHandler)
  }
}

function autoResizeHandler () {
  if (this.autoResize) {
    window.addEventListener('resize', this.reflowHandler, false)
  } else {
    window.removeEventListener('resize', this.reflowHandler, false)
  }
}

function getReflowHandler (token) {
  return function () {
    clearTimeout(token)
    token = setTimeout(this.reflow, this.interval)
  }
}

function reflow () {
  let width = this.$el.clientWidth

  let slots = this.$children
  let metas = slots.map((slot) => slot.getMeta())
  let styles = slots.map((slot) => slot.getStyle())
  this.virtualStyles = getArrayFillWith(() => ({}), styles.length)
  calculate(this, metas, this.virtualStyles)
  setTimeout(() => {
    if (isScrollBarVisibilityChange(this.$el, width)) {
      calculate(this, metas, this.virtualStyles)
    }
    applyStyles(this.virtualStyles, styles)
    this.$broadcast('wf-reflowed', [this])
    this.$dispatch('wf-reflowed', [this])
  }, 0)
}

function isScrollBarVisibilityChange (el, lastClientWidth) {
  return lastClientWidth !== el.clientWidth
}

function calculate (vm, metas, styles) {
  let options = getOptions(vm)
  let processor = vm.line === 'h' ? horizontalLineProcessor : verticalLineProcessor
  processor.calculate(vm, options, metas, styles)
}

function getOptions (vm) {
  return {
    align: ~['left', 'right', 'center'].indexOf(vm.align) ? vm.align : 'left',
    line: ~['v', 'h'].indexOf(vm.line) ? vm.line : 'v',
    lineGap: +vm.lineGap,
    minLineGap: vm.minLineGap ? +vm.minLineGap : vm.lineGap,
    maxLineGap: vm.maxLineGap ? +vm.maxLineGap : vm.lineGap,
    singleMaxWidth: Math.max(vm.singleMaxWidth || 0, vm.maxLineGap),
    fixedHeight: !!vm.fixedHeight
  }
}

var verticalLineProcessor = (() => {

  function calculate (vm, options, metas, styles) {
    let width = vm.$el.clientWidth
    let strategy = getRowStrategy(width, options)
    let tops = getArrayFillWith(0, strategy.count)
    metas.forEach((meta, index) => {
      let offset = tops.reduce((last, top, i) => top < tops[last] ? i : last, 0)
      let style = styles[index]
      style.top = tops[offset]
      style.left = strategy.left + strategy.width * offset
      style.width = strategy.width
      style.height = meta.height * (options.fixedHeight ? 1 : strategy.width / meta.width)
      tops[offset] = tops[offset] + style.height
    })
    vm.style.height = Math.max.apply(null, tops) + 'px'
  }

  function getRowStrategy (width, options) {
    let count = width / options.lineGap
    let slotWidth
    if (options.singleMaxWidth >= width) {
      count = 1
      slotWidth = Math.max(width, options.minLineGap)
    } else {
      let maxContentWidth = options.maxLineGap * ~~count
      let minGreedyContentWidth = options.minLineGap * ~~(count + 1)
      let canFit = maxContentWidth >= width
      let canFitGreedy = minGreedyContentWidth <= width
      if (canFit && canFitGreedy) {
        count = Math.round(count)
        slotWidth = width / count
      } else if (canFit) {
        count = ~~count
        slotWidth = width / count
      } else if (canFitGreedy) {
        count = ~~(count + 1)
        slotWidth = width / count
      } else {
        count = ~~count
        slotWidth = options.maxLineGap
      }
      if (count === 1) {
        slotWidth = Math.min(width, options.singleMaxWidth)
        slotWidth = Math.max(slotWidth, options.minLineGap)
      }
    }
    return {
      width: slotWidth,
      count: count,
      left: getLeft(width, slotWidth * count, options.align)
    }
  }

  return {
    calculate
  }

})()

var horizontalLineProcessor = (() => {

  function calculate (vm, options, metas, styles) {
    let width = vm.$el.clientWidth
    let total = metas.length
    let top = 0
    let offset = 0
    while (offset < total) {
      let strategy = getRowStrategy(width, options, metas, offset)
      for (let i = 0, left = 0, meta, style; i < strategy.count; i++) {
        meta = metas[offset + i]
        style = styles[offset + i]
        style.top = top
        style.left = strategy.left + left
        style.width = meta.width * strategy.height / meta.height
        style.height = strategy.height
        left += style.width
      }
      offset += strategy.count
      top += strategy.height
    }
    vm.style.height = top + 'px'
  }

  function getRowStrategy (width, options, metas, offset) {
    let greedyCount = getGreedyCount(width, options.lineGap, metas, offset)
    let lazyCount = Math.max(greedyCount - 1, 1)
    let greedySize = getContentSize(width, options, metas, offset, greedyCount)
    let lazySize = getContentSize(width, options, metas, offset, lazyCount)
    let finalSize = chooseFinalSize(lazySize, greedySize, width)
    let height = finalSize.height
    let fitContentWidth = finalSize.width
    if (finalSize.count === 1 || options.singleMaxWidth >= width) {
      fitContentWidth = Math.min(options.singleMaxWidth, width)
      height = metas[offset].height * fitContentWidth / metas[offset].width
    }
    return {
      left: getLeft(width, fitContentWidth, options.align),
      count: finalSize.count,
      height: height
    }
  }

  function getGreedyCount (rowWidth, rowHeight, metas, offset) {
    let count = 0
    for (let i = offset, width = 0; i < metas.length && width <= rowWidth; i++) {
      width += metas[i].width * rowHeight / metas[i].height
      count++
    }
    return count
  }

  function getContentSize (rowWidth, options, metas, offset, count) {
    let originWidth = 0
    for (let i = count - 1; i >= 0; i--) {
      let meta = metas[offset + i]
      originWidth += meta.width * options.lineGap / meta.height
    }
    let fitHeight = options.lineGap * rowWidth / originWidth
    let canFit = (fitHeight <= options.maxLineGap && fitHeight >= options.minLineGap)
    if (canFit) {
      return {
        cost: Math.abs(options.lineGap - fitHeight),
        count: count,
        width: rowWidth,
        height: fitHeight
      }
    } else {
      let height = originWidth > rowWidth ? options.minLineGap : options.maxLineGap
      return {
        cost: Infinity,
        count: count,
        width: originWidth * height / options.lineGap,
        height: height
      }
    }
  }

  function chooseFinalSize (lazySize, greedySize, rowWidth) {
    if (lazySize.cost === Infinity && greedySize.cost === Infinity) {
      return greedySize.width < rowWidth ? greedySize : lazySize
    } else {
      return greedySize.cost >= lazySize.cost ? lazySize : greedySize
    }
  }

  return {
    calculate
  }

})()

function getLeft (width, contentWidth, align) {
  switch (align) {
    case 'right':
      return width - contentWidth
    case 'center':
      return (width - contentWidth) / 2
    default:
      return 0
  }
}

function applyStyles (src, des) {
  src.forEach((style, i) => {
    for (let prop in style) {
      des[i][prop] = style[prop] + 'px'
    }
  })
}

function getArrayFillWith (item, count) {
  let getter = (typeof item === 'function') ? () => item() : () => item
  let arr = []
  for (let i = 0; i < count; i++) {
    arr[i] = getter()
  }
  return arr
}

</script>
