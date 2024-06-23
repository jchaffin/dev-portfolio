import express from 'express';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import{ hot, server } from './appConfig.json';
import webpackConfig from './webpack.config.babel';

const app = express();
const config = webpackConfig({production: false});
const compiler = webpack(config);


app.use(
  webpackDevMiddleware(compiler, {
    publicPath: config[0].output.publicPath,
  })
);

app.use(webpackHotMiddleware(compiler,
  {
    log: console.log,
     path: '/__webpack_hmr',
     heartbeat: 10 * 1000,
  })
);

const { host, port } = server;

app.listen(port, 
  () => console.log(`listening on http://${host}:${port}`)
);

