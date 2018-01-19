<template>
  <div class="vue-waterfall-slot" v-show="isShow">
    <slot></slot>
  </div>
</template>

<style>
.vue-waterfall-slot {
  position: absolute;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>

<script>

export default {
  data () {
    return {
      isShow: false,
      slotWidth: this.width,
      slotHeight: this.height
    }
  },
  props: {
    width: {
      required: true,
      validator: (val) => val >= 0
    },
    height: {
      required: true,
      validator: (val) => val >= 0
    },
    order: {
      default: 0
    },
    moveClass: {
      default: ''
    }
  },
  methods: {
    notify () {
      this.$parent.$emit('reflow', this)
    },
    getMeta () {
      return {
        vm: this,
        node: this.$el,
        order: this.order,
        width: this.slotWidth,
        height: this.slotHeight,
        moveClass: this.moveClass
      }
    }
  },
  created () {
    this.rect = {
      top: 0,
      left: 0,
      width: 0,
      height: 0
    }
    this.$watch(() => (
      this.slotWidth,
      this.slotHeight
    ), this.notify)
  },
  mounted () {
    this.$parent.$once('reflowed', () => {
      this.isShow = true
    })
    this.notify()
  },
  destroyed () {
    this.notify()
  }
}

</script>
