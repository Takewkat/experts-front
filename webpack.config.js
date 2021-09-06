const mode = process.env.NODE_ENV;
const devMode = mode === 'development';

export default {
  output: { filename: '[name].min.js' },
  mode: mode,
  stats: 'none',
  devtool: devMode ? 'source-map' : 'none',
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: [{
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }]
    }]
  }
}
