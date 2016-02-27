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
  data: () => ({
    isShow: false
  }),
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
      this.$dispatch('wf-reflow', [this])
    },
    getMeta () {
      return {
        vm: this,
        node: this.$el,
        order: this.order,
        width: this.width,
        height: this.height,
        moveClass: this.moveClass
      }
    }
  },
  compiled () {
    this.$watch('width, height', this.notify)
    this.$once('wf-reflowed', () => this.isShow = true)
    this.rect = {
      top: 0,
      left: 0,
      width: 0,
      height: 0
    }
  },
  attached () {
    this.notify()
  },
  detached () {
    this.notify()
  }
}

</script>
