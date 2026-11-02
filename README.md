# ナツ印（NATSU-in）

日本語の説明のあとに英語の説明があります。English follows the Japanese.

合言葉「ナツ印」で、日付入りの丸い印影（上段・日付・下段の 3 段）の画像を、クリップボードへコピーしたり、透過 PNG で保存したりするプラグインです。
印影は Mac のナツ印のアプリが、アプリの設定（上段・下段の文字・書体・色・日付の書き方）のまま描きます。
見た目としての印影画像で、確認した事実を証明するものではありません。

## 要るもの

- macOS と、App Store の Mac のナツ印（拡張モードを持つ版）。Windows などでは使えません。
- アプリが使える状態であること（購入済みなど。くわしくは https://natsu-in.com ）。
- Node.js 18 以上（MCP のサーバーを `node` で動かします）。
- 使える場所：Claude Code と、Cowork（作業が自分の Mac で動くとき）。ふだんの Claude のチャットでは、プラグインの中の MCP のサーバーは動きません。チャットで使うときは、natsu-in.com で配る `.mcpb` を Claude Desktop に入れてください。

## 試し方（審査する人へ）

1. Mac の App Store で「ナツ印」を入れる（https://apps.apple.com/app/id6829200381 ）。アカウントの作成やサインインは要りません。
2. ナツ印を開き、初回の設定で上段と下段の文字を入れる（例：「救急科」「山田 太郎」）。
3. 購入の画面で「30日間無料で試す」を押す（0円の体験。購入はしません）。
4. Claude Code（`claude --plugin-dir` か、このプラグインを入れる）か、自分の Mac で動く Cowork で「ナツ印」と頼む。今日の日付の印影がクリップボードに入り、画像が返ります。

## 使い方の例

1. 「ナツ印」→ 今日の日付の印影をクリップボードへコピーし、その画像を見せます。返信などに貼り付け（⌘V）ます。
2. 「昨日の日付でナツ印」→ 昨日の日付の印影をコピーします。日付があいまいなときは Claude が確かめます。
3. 「10月27日と10月30日の日付で、ナツ印をダウンロードのフォルダに」→ `stamp_20261027.png` と `stamp_20261030.png` を保存します。
4. 「ナツ印の設定はどうなってる？」→ 初回の設定が済んでいるかと、書体・色・大きさ・日付の書き方を答えます（上段・下段の文字は答えません）。

## 道具

| 名前 | 中身 | 変えるもの |
| --- | --- | --- |
| `natsuin`（ナツ印） | `save_to` なし：印影をクリップボードへコピーし、画像も返す。`save_to` あり：透過 PNG をそこに保存し、場所と画像を返す（上書きしない） | クリップボード、または新しい PNG |
| `natsuin_status`（ナツ印の状態） | 初回の設定が済んでいるかと、印影の設定。上段・下段の文字は返さない | なし |
| `natsuin_stamp_image`（印影の画像） | 指定した日付の印影の透過 PNG（コピーも保存もしない） | なし |

日付は `today`・`yesterday`・`day_before_yesterday`・`YYYY-MM-DD`（2000-01-01〜当日の 1 年後の同じ日）。

## 動かすもの・送るもの・取りに行くもの

- 動かすもの：このプラグインの `server/index.js`（Node）。それが、Mac のナツ印のアプリ（`/Applications/natsuin.app`）を窓を出さない拡張モード（`--mcp`）で起動します。ほかのプログラムは動かしません。
- 読むもの：ナツ印のアプリの設定（アプリが自分の保存先から読みます）。書類やほかのファイルは読みません。
- 書くもの：クリップボード（印影の PNG）、または頼まれた保存先の PNG ファイル。
- 送るもの：印影の画像と短い説明の文を、使ったときだけ Claude との会話に返します。印影の中には、上段・下段に入れた文字（氏名など）が入ります。
- 取りに行くもの：ありません。プラグインとナツ印のアプリは、インターネットに通信しません。追加のライブラリも取りに行きません。
- 印影は、アプリの描画の関数で描く画像です。AI のモデルで作るものではありません。

## Privacy Policy

ナツ印のプラグインとアプリは通信せず、会話の中身を集めず、保存せず、ほかへ送りません。渡した画像のその後の扱いは、Claude の提供元の決まりに従います。
くわしくは https://natsu-in.com/privacy.html をご覧ください。

## Support

https://natsu-in.com/support.html のお問い合わせフォーム、または support@natsu-in.com へ。

---

# NATSU-in (English)

NATSU-in is a plugin that gives Claude a dated round stamp image (top text, date, bottom text), the kind Japanese offices use to show that a document has been seen. When you say the wake word "ナツ印" (NATSU-in), Claude copies the stamp to the clipboard so you can paste it with ⌘V, or saves it as a transparent PNG file in a folder you name. The NATSU-in Mac app draws the stamp with your own settings (text, typeface, color, and date format). The stamp is a visual image only. It does not prove that anything was checked or approved.

## Requirements

- macOS and the NATSU-in Mac app from the App Store (a version with the extension mode). It does not work on Windows or other systems.
- The app must be in a usable state (for example, purchased). Details: https://natsu-in.com
- Node.js 18 or later, because the MCP server runs with `node`.
- Where it works: Claude Code, and Cowork when the session runs on your own Mac. Claude chat ignores local MCP servers in plugins; to use NATSU-in in chat, install the `.mcpb` desktop extension from natsu-in.com in Claude Desktop.

## How to test (for reviewers)

1. Install "ナツ印" (NATSU-in) from the Mac App Store: https://apps.apple.com/app/id6829200381 . No account or sign-in is needed.
2. Open the app and complete the first-run setup with any top and bottom text (for example "救急科" and "山田 太郎").
3. On the purchase screen, tap 「30日間無料で試す」 (start the free 30-day trial; nothing is charged).
4. In Claude Code (with `claude --plugin-dir` or after installing this plugin), or in Cowork running on the same Mac, say "ナツ印". Today's stamp is copied to the clipboard and the image is returned.

## Example prompts

1. "ナツ印" — copies today's stamp to the clipboard and shows the image.
2. "Use yesterday's date with ナツ印" — copies yesterday's stamp. Claude asks if the date is unclear.
3. "ナツ印 for October 27 and October 30, saved to my Downloads folder" — saves `stamp_20261027.png` and `stamp_20261030.png`.
4. "What are my ナツ印 settings?" — reports whether setup is done, plus the typeface, color, size, and date format. It never reports the top or bottom text.

## Tools

- `natsuin` (NATSU-in): without `save_to`, copies the stamp to the clipboard and returns the image. With `save_to`, saves a transparent PNG there and returns its path and the image. It never overwrites a file; it adds " (2)" instead.
- `natsuin_status`: whether setup is done, and the stamp settings except the top and bottom text. Read-only.
- `natsuin_stamp_image`: the stamp for a given date as a transparent PNG, without copying or saving. Read-only.

Dates are `today`, `yesterday`, `day_before_yesterday`, or `YYYY-MM-DD` (from 2000-01-01 to one year after today).

## What the plugin runs, sends, and fetches

- Runs: this plugin's `server/index.js` with Node. It starts the NATSU-in Mac app (`/Applications/natsuin.app`) in a windowless extension mode (`--mcp`). It runs no other program.
- Reads: the app's own settings, read by the app. It does not read documents or any other files.
- Writes: the clipboard (the stamp PNG), or a PNG file at the location you ask for.
- Sends: the stamp image and a short caption back to your Claude conversation, only when you use it. The image contains the top and bottom text you set in the app, such as your name.
- Fetches: nothing. The plugin and the app make no network connections and download no packages.
- The stamp is drawn by the app's own drawing code. It is not generated by an AI model.

## Privacy Policy

The NATSU-in plugin and app make no network connections, and they do not collect, store, or share conversation content. What happens to the image after it reaches Claude follows Anthropic's terms. Full policy: https://natsu-in.com/privacy.html

## Support

Contact form: https://natsu-in.com/support.html ／ Email: support@natsu-in.com

## License

The plugin's code is under the MIT License (`LICENSE`). The NATSU-in app itself is offered under Apple's standard license agreement for App Store apps.
