'use strict';
// ナツ印の拡張（試作）：Claude Desktop などの AI のアプリと、Mac のナツ印のアプリの間に立つ小さな MCP のサーバー。
//
// - 印影の道具（状態・画像・コピー）は、ナツ印のアプリを窓なしの拡張モード（--mcp）で起動して、そのまま取り次ぐ。
// - 印影の PNG を、指定された場所に保存して渡す（App Store のアプリはサンドボックスで好きな場所に書けないため、保存はここで行う）。
//   書類には触れない。
// - 外へ通信しない。追加のライブラリを使わない。ログに上段・下段の文字を出さない。

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const VERSION = '0.1.0';
const APP = process.env.NATSUIN_APP || '/Applications/natsuin.app';
const APP_BIN = path.join(APP, 'Contents', 'MacOS', 'natsuin');

// ---- ナツ印のアプリ（--mcp）との通信 ----------------------------------------------------

class AppClient {
  constructor(bin) {
    this.bin = bin;
    this.child = null;
    this.pending = new Map();
    this.nextId = 1;
    this.ready = null;
  }

  async start() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      if (process.platform !== 'darwin' && !process.env.NATSUIN_TEST_ANY_PLATFORM) {
        throw new Error('ナツ印のアプリ（拡張モード）は Mac だけです。Windows などでは使えません。');
      }
      if (!fs.existsSync(this.bin)) {
        throw new Error(`ナツ印のアプリが見つかりません（${APP}）。App Store から Mac のナツ印を入れてください。`);
      }
      this.child = spawn(this.bin, ['--mcp'], { stdio: ['pipe', 'pipe', 'ignore'] });
      this.child.on('exit', () => {
        for (const { reject } of this.pending.values()) reject(new Error('ナツ印のアプリが止まりました。'));
        this.pending.clear();
        this.child = null;
        this.ready = null;
      });
      this.child.on('error', () => {});
      readline.createInterface({ input: this.child.stdout }).on('line', (line) => {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          return;
        }
        const waiter = this.pending.get(message.id);
        if (!waiter) return;
        this.pending.delete(message.id);
        if (message.error) waiter.reject(new Error(message.error.message || 'ナツ印のアプリの誤り'));
        else waiter.resolve(message.result);
      });
      await this.request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'natsu-in-extension', version: VERSION },
      });
      this.notify('notifications/initialized');
    })();
    try {
      return await this.ready;
    } catch (error) {
      this.ready = null;
      throw error;
    }
  }

  request(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  notify(method, params) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) })}\n`);
  }

  async call(name, args) {
    await this.start();
    return this.request('tools/call', { name, arguments: args || {} });
  }

  async tools() {
    await this.start();
    return (await this.request('tools/list', {})).tools;
  }

  stop() {
    if (this.child) this.child.stdin.end();
  }
}

// ---- 道具「ナツ印」 -----------------------------------------------------------------------
//
// ナツ印の仕事は印影の PNG を渡すところまで。書類は読まず、書き換えない（2026-11-02 決定）。

class UsageError extends Error {}

function expandPath(input) {
  if (typeof input !== 'string' || !input.trim()) throw new UsageError('保存先（save_to）を指定してください。');
  let p = input.trim();
  if (p === '~') p = os.homedir();
  else if (p.startsWith('~/')) p = path.join(os.homedir(), p.slice(2));
  if (!path.isAbsolute(p)) throw new UsageError('保存先は、/ か ~/ から始まる Mac の上の場所で指定してください。');
  return p;
}

/** 保存する PNG の場所。フォルダなら中に fileName で、.png ならその名前で。同じ名前があれば「 (2)」を付ける（上書きしない）。 */
function savePathFor(saveTo, fileName) {
  const target = expandPath(saveTo);
  let dir;
  let name;
  if (path.extname(target).toLowerCase() === '.png') {
    dir = path.dirname(target);
    name = path.basename(target);
  } else {
    dir = target;
    name = fileName;
  }
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new UsageError('保存先のフォルダがありません。Mac の上にあるフォルダを指定してください。');
  }
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  for (let n = 1; n < 100; n++) {
    const candidate = path.join(dir, `${base}${n === 1 ? '' : ` (${n})`}${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new UsageError('保存する名前を決められませんでした（同じ名前が多すぎます）。');
}

const DATE_PROPERTY = {
  type: 'string',
  description:
    '印影の日付。today・yesterday・day_before_yesterday・YYYY-MM-DD のどれか。省略すると今日。本人がはっきり言ったときだけ今日以外にする。',
};

// 呼び出しやすさのため、AI に見せる入口は「ナツ印」1 つにまとめる（合言葉と同じ名前）。
const NATSUIN_TOOL = {
  name: 'natsuin',
  title: 'ナツ印',
  description:
    '本人が合言葉「ナツ印」で頼んだら使う（例：「ナツ印」「今日の日付でナツ印」「この議事録にナツ印」）。頼まれたこと自体を本人の判断とみなし、重ねて確かめない。' +
    '・save_to なし：印影をクリップボードへコピーし、画像も返す。「貼り付け（⌘V）で貼れます」と伝える。' +
    '・save_to あり：印影の透過 PNG をそこ（Mac の上のフォルダか .png の名前）に保存し、場所と画像を返す（クリップボードは変えない。同じ名前があれば上書きせず「 (2)」を付ける）。' +
    'ナツ印の仕事は印影の画像を渡すところまで（書類は読まず、書き換えない）。同じ日付の PNG は 1 つあれば何度でも使える。',
  inputSchema: {
    type: 'object',
    properties: {
      date: DATE_PROPERTY,
      save_to: {
        type: 'string',
        description:
          'PNG の保存先。Mac の上のフォルダ（中に stamp_YYYYMMDD.png を作る）か、.png で終わるファイルの名前。/ か ~/ から始まる場所。省略するとクリップボードへコピーする。',
      },
      size: {
        type: 'string',
        enum: ['small', 'standard', 'large'],
        description: '保存する PNG の大きさ（small 96・standard 160・large 240 画素）。省略すると large（書類向け）。コピーのときはナツ印の設定の大きさ。',
      },
    },
    additionalProperties: false,
  },
  annotations: { title: 'ナツ印', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
};

// AI に見せるアプリの道具（コピーは natsuin にまとめたので出さない）。
const SHOWN_APP_TOOLS = ['natsuin_status', 'natsuin_stamp_image'];

function textResult(text, isError = false) {
  return { content: [{ type: 'text', text }], isError };
}

async function callNatsuin(app, args) {
  const date = args.date ? { date: args.date } : {};
  if (args.save_to === undefined || args.save_to === null || args.save_to === '') {
    return app.call('natsuin_copy_stamp', date);
  }
  expandPath(args.save_to); // 印影を作る前に、場所の書き方を確かめる
  const image = await app.call('natsuin_stamp_image', { ...date, size: args.size || 'large' });
  if (image.isError) return image;
  const png = image.content.find((c) => c.type === 'image');
  const caption = image.content.find((c) => c.type === 'text');
  if (!png) return textResult('印影の画像を作れませんでした。', true);
  const named = caption && caption.text.match(/stamp_\d{8}\.png/);
  const output = savePathFor(args.save_to, named ? named[0] : 'stamp.png');
  fs.writeFileSync(output, Buffer.from(png.data, 'base64'), { flag: 'wx' });
  return {
    content: [
      {
        type: 'text',
        text:
          `${caption ? `${caption.text}\n` : ''}保存しました：${output}\n` +
          '書類に入れるときは、直径 15〜18 mm ほどが目安です（ほかの人の印影があれば、その大きさにそろえる）。',
      },
      png,
    ],
    isError: false,
  };
}

// ---- Claude との通信（MCP・標準入出力） ----------------------------------------------------

const INSTRUCTIONS =
  'ナツ印は、日付入りの丸い印影（見た目としての画像）を作る。確認した事実を証明するものではない。' +
  '合言葉は「ナツ印」。本人が「ナツ印」と言ったら natsuin を呼ぶ（頼まれたこと自体を本人の判断とみなし、重ねて確かめない）。' +
  'ふだんは save_to なしでコピーする（本人が ⌘V で貼る）。ファイルで欲しいとき（たくさんの議事録の分を日付ごとに用意する など）は save_to に保存先を入れる。' +
  'ナツ印の仕事は印影の画像を渡すところまで（書類は読まず、書き換えない）。' +
  '「捺印して」「ハンコを押して」だけで「ナツ印」と言われていないときは、ナツ印を使うか確かめる。' +
  '今日でない日付は、本人が日付をはっきり言ったときだけ使う。印影を使ったことを、承認や送信が済んだように言わない。';

async function main() {
  const app = new AppClient(APP_BIN);
  const out = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
  const reply = (id, result) => out({ jsonrpc: '2.0', id, result });
  const fail = (id, code, message) => out({ jsonrpc: '2.0', id, error: { code, message } });

  const handle = async (message) => {
    const { id, method, params = {} } = message;
    const isNotification = !Object.prototype.hasOwnProperty.call(message, 'id');
    switch (method) {
      case 'initialize':
        return reply(id, {
          protocolVersion: ['2025-06-18', '2025-03-26', '2024-11-05'].includes(params.protocolVersion)
            ? params.protocolVersion
            : '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'natsu-in', title: 'ナツ印', version: VERSION },
          instructions: INSTRUCTIONS,
        });
      case 'ping':
        return reply(id, {});
      case 'tools/list': {
        let appTools = [];
        try {
          appTools = await app.tools();
        } catch {
          // アプリが無くても一覧は返す（呼んだときに理由を返す）。
        }
        const shown = appTools.filter((t) => SHOWN_APP_TOOLS.includes(t.name));
        return reply(id, { tools: [NATSUIN_TOOL, ...shown] });
      }
      case 'tools/call': {
        const name = params.name;
        const args = params.arguments || {};
        try {
          if (name === NATSUIN_TOOL.name) return reply(id, await callNatsuin(app, args));
          return reply(id, await app.call(name, args));
        } catch (error) {
          const known = error instanceof UsageError || /ナツ印のアプリ/.test(error.message);
          return reply(id, textResult(known ? error.message : 'ナツ印の道具の実行に失敗しました。', true));
        }
      }
      default:
        if (isNotification || method === undefined) return undefined;
        return fail(id, -32601, 'Method not found');
    }
  };

  const queue = [];
  let running = false;
  const pump = async () => {
    if (running) return;
    running = true;
    while (queue.length) {
      const line = queue.shift();
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        fail(null, -32700, 'Parse error');
        continue;
      }
      await handle(message);
    }
    running = false;
  };
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    queue.push(line);
    pump();
  });
  rl.on('close', async () => {
    while (running || queue.length) await new Promise((r) => setTimeout(r, 10));
    app.stop();
    process.exit(0);
  });
}

module.exports = { main, savePathFor, NATSUIN_TOOL, INSTRUCTIONS };
