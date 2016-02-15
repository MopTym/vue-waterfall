const webpack = require('webpack')
const npmCfg = require('../package.json')

var banner = [
  'vue-waterfall v' + npmCfg.version,
  '(c) ' + (new Date().getFullYear()) + ' ' + npmCfg.author,
  npmCfg.homepage
].join('\n')

module.exports = {
  entry: './src',
  output: {
    path: './lib',
    filename: 'vue-waterfall.js',
    library: 'Waterfall',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['', '.js', '.vue']
  },
  module: {
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      },
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      }
    ]
  },
  vue: {
    loaders: {
      js: 'babel'
    }
  },
  plugins: [
    new webpack.BannerPlugin(banner)
  ]
}
