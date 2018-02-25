const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const clientConfig = {

  devtool: 'source-map',

  entry: {
    'client': './public/src/client.js',
    'client.min': './public/src/client.js'
  },

	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
        query: {
          plugins: [
            'transform-object-assign',
            'transform-runtime'
          ],
          presets: [
            ['env', {
              targets: {
                browsers: [
                  'last 2 Chrome versions',
                  'last 2 Safari versions',
                  'last 2 Firefox versions',
                  'last 2 Edge versions'
                ]
              }
            }]
          ]
        }
			}
    ]
  },
  
  plugins: [
    new UglifyJsPlugin({
      include: /\.min\.js$/
    })
  ],

  output: {
    filename: '[name].js',
    libraryTarget: 'umd', /* So output can work in Node and in browser */
    path: path.resolve(__dirname, 'public/src/build')
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  }

};

const serverConfig = {

  devtool: 'source-map',

  entry: {
    server: './shared/shared.js'
  },

	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
				options: {
					plugins: [
						['transform-react-jsx', { pragma: 'h' }]
					]
				}
			}
    ]
  },

  output: {
    filename: '[name].js',
    libraryTarget: 'umd', /* So output can work in Node and in browser */
    path: path.resolve(__dirname, 'build')
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },

  target: 'node'

};

const testsConfig = {
  devtool: 'source-map',

  entry: {
    'tests': './test/tests.js',
  },

	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
        query: {
          plugins: [
            'transform-object-assign',
            'transform-runtime'
          ],
          presets: [
            ['env', {
              targets: {
                browsers: [
                  'last 2 Chrome versions',
                  'last 2 Safari versions',
                  'last 2 Firefox versions',
                  'last 2 Edge versions'
                ]
              }
            }]
          ]
        }
			}
    ]
  },
  
  output: {
    filename: '[name].js',
    libraryTarget: 'umd', /* So output can work in Node and in browser */
    path: path.resolve(__dirname, 'build')
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },

  target: 'node'
  
};

module.exports = [ clientConfig, serverConfig, testsConfig ];