import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import stats from '../api/stats.js';
import collect from '../api/collect.js';
const files = new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/style.css','style.css'],['/lib/config.js','lib/config.js']]);
const root = new URL('../', import.meta.url);
createServer(async (req,res) => {
  res.status = (code) => {res.statusCode=code;return res;};
  res.json = (data) => {res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));return res;};
  try {
    const url = new URL(req.url,'http://localhost');
    req.query = Object.fromEntries(url.searchParams);
    if (url.pathname === '/api/stats') return await stats(req,res);
    if (url.pathname === '/api/collect') {
      let body='';for await (const chunk of req) {body+=chunk;if(body.length>16384)return res.status(413).json({error:'Request too large'});}
      req.body=body;return await collect(req,res);
    }
    const file=files.get(url.pathname);
    if(!file)return res.status(404).end('Not found');
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');
    res.setHeader('Cache-Control','no-store');res.end(await readFile(new URL(file,root)));
  } catch(error) {if(!res.headersSent)res.status(500).json({error:error.message});else res.end();}
}).listen(3000,'127.0.0.1',()=>console.log('收益面板：http://127.0.0.1:3000'));
