<template>
  <div class="vue-waterfall-slot" :style="style" v-show="isShow">
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
    style: {
      top: '',
      left: '',
      width: '',
      height: '',
      display: 'none'
    },
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
    }
  },
  methods: {
    notify () {
      this.$dispatch('wf-reflow', [this])
    },
    getMeta () {
      return {
        width: this.width,
        height: this.height
      }
    },
    getStyle () {
      return this.style
    }
  },
  compiled () {
    this.$watch('width, height', this.notify)
    this.$once('wf-reflowed', () => this.isShow = true)
  },
  attached () {
    this.notify()
  },
  detached () {
    this.notify()
  }
}

</script>
