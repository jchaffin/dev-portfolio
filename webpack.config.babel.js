import R from 'ramda';
import path from 'path';
import cssnano from 'cssnano';
import nodeExternals from 'webpack-node-externals';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { ProgressPlugin, HotModuleReplacementPlugin } from 'webpack';
import ESLintPlugin from 'eslint-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { loader, entry, output, tap, plugin } from 'webpack-partial';

const { NODE_ENV } = process.env;


const isProd = (env = NODE_ENV) => env && (env.production || env === 'production') ;

const js = (options) => loader({
    test: /\.(js|jsx)$/,
    loader: 'babel-loader',
    exclude: /node_modules/,
    options
});

const html = (options) => plugin(new HtmlWebpackPlugin(options));


const css = R.curry((prodMode, config) =>
  R.compose(
    prodMode
    ? plugin(
      new OptimizeCSSAssetsPlugin({
        cssProcessor: cssnano,
        canPrint: false,
      })
    )
    : R.identity,
    plugin(
      new MiniCssExtractPlugin({
        filename: !prodMode ? '[name].css' : '[name].[hash].css',
        chunkFilename: !prodMode ? '[id].css' : '[id].hash.css'
      })
    ),
    loader({
      test: /\.css$/,
      use: [
        prodMode ? MiniCssExtractPlugin.loader : 'style-loader',
       'css-loader'
      ]
    })
  )(config));

const sourcemap = R.curry((devtool, config) =>
  loader(
    {
      enforce: 'pre',
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'source-map-loader'
    },
    Object.assign(devtool, config)
  )
);
const clean = (opts) => plugin(new CleanWebpackPlugin(opts));

const hot = R.curry((options, config) => 
  plugin(new HotModuleReplacementPlugin(), config)
);


const node = R.curry((nodeOptions, config) =>
  R.mergeWith(
    R.concat,
    {
      target: 'node',
      externals: [nodeExternals()],
      node: nodeOptions,
     },
     config
    )
);
  
const name = R.curry((compiler, config) => Object.assign({name: compiler}, config));
const resolve = R.curry((options, config) => Object.assign({resolve: options}, config));

const devConfig = {
  mode: 'development', 
  context: __dirname, 
  devtool: 'source-map',
};

const prodConfig = {
  mode: 'production',
  performance: {
    hints: 'warning',
    maxAssetSize: 450000,
  },
  recordsPath: path.join(__dirname, 'records.json'),
};

let hotMiddlewareScript = (name) =>
  `webpack-hot-middleware/client?name=${name}&path=/__webpack_hmr&timeout=20000`;

let clientConfig = (env) => 
R.compose(
  name('client'),
  entry({
    client: ['@babel/polyfill', './src/client/index', hotMiddlewareScript("client")]
  }),
  output({
    filename: '[name].js', 
    path: path.resolve(__dirname, 'build/public'),
    publicPath: '/',
    }),
  resolve({extensions: ['*', '.js', '.jsx']}),
  html({
    template: 'src/index.ejs',
    filename: 'index.html',
    title: 'Portfolio',
    mountId: 'root'
  }),
  js({
    presets: [
    ['@babel/preset-env', { targets: "defaults" }],
    ['@babel/preset-react'],
   ],
   plugins: [!isProd(env) && 'react-refresh/babel'].filter(Boolean),
  }),
  plugin(new ProgressPlugin()),
  plugin(new HotModuleReplacementPlugin()),
  plugin(new ReactRefreshWebpackPlugin())
)(isProd(env) ? prodConfig : devConfig);


let serverConfig = (env) => R.compose(
  name('server'),
  entry({server: ['./src/server/index']}),
  output({
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
  }),
  js({
    presets: [['@babel/preset-env', { targets: {node: 'current'}}]],
  }),
  node({__dirname: false})
)(isProd(env) ? prodConfig : devConfig);

export default (env) => [clientConfig(env), serverConfig(env)]