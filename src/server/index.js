import express from 'express';
import { Server } from 'http';
import path from 'path';

let app = express();
const server = Server(app);

server.listen(3000);
console.log(`Started server on http://localhost:3000`);
app.get('/', (_req, res) =>
  res.sendFile(path.resolve(__dirname, 'public/index.html'))
);

app.use(express.static(path.resolve(__dirname, 'public')));
