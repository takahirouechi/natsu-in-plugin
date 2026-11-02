#!/usr/bin/env node
'use strict';
// ナツ印の拡張の入口。Claude Desktop の内蔵の Node は、この入口を別のスクリプトから読み込むことがあり
// （require.main が入口にならない）、そのときも必ず動くよう、読み込まれたら無条件にサーバーを始める。
// 中身とテスト用の関数は server.js にある。
require('./server.js').main();
