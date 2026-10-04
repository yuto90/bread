# Bread

[English](README.md) · 日本語

[公開 Playground](https://bread-playground.pages.dev/?lang=ja) ·
[日本語ドキュメント](https://bread-playground.pages.dev/docs/ja/) ·
[English docs](https://bread-playground.pages.dev/docs/)

**接続を書くと、自動配置されたブレッドボード配線図が得られます。**

小さな `.bread` ファイルに部品と接続を記述すると、Bread が穴を割り当て、
ジャンパーを配置して SVG を生成します。物理接続を独立に再構築し、期待する
論理ネットとの一致を確認します。配置座標の記述は不要です。

現在は製品開発の初期段階です。対応する有限の回路構成を扱うもので、任意の
回路、実機の収まり、安全な組み立てや電気的な動作を保証しません。
独自ソフトウェアは **MIT**、Arduino 由来の形状と生成イラストは
**CC BY-SA 4.0** です。[適用範囲](LICENSES/README.md)を確認してください。

## ローカルで試す

Node **24.19.0**（`.nvmrc`）を使用します。

```sh
npm ci --ignore-scripts
npm run playground
```

[Playground](http://127.0.0.1:4173/?lang=ja) の日本語 UI で6サンプルを試せます。
[日本語ドキュメント](http://127.0.0.1:4173/docs/ja/)と
[English docs](http://127.0.0.1:4173/docs/)には、導入、DSL、部品、実ソースと
図の比較、エラー、制限、ライセンス、開発参加の9ガイドがあります。
これらはサーバーを起動した PC の**開発用ローカルアドレス**です。公開版は冒頭のリンクから使えます。

言語の初期値は対応するブラウザー言語（未対応時は英語）です。選択した言語だけを
ブラウザーに保存します。ソースはタブ内のメモリーだけで扱い、再読み込みや
サンプルの切り替えで失われます。DSL の識別子、エラーコード、出力 SVG は
翻訳しません。日本語の診断には元のコンパイラーの詳細も残します。

## 対応範囲

- Uno R3、220Ω 抵抗、赤色 LED の1分岐、または共通 GND1 の3〜6分岐。
- DHT22、ボタン、半固定抵抗、LED を使う指定の複合配線構成。
- 1N4148 と LED の直列回路。5V/GND1 間の無極性 100nF コンデンサーは最大1個。

固定の300穴ボードを使います。LED 2分岐は未対応、7〜12分岐は配置容量エラーです。
部品型が認識されても任意の組み合わせは使えません。交差する線は接続点ではありません。
リード加工、センサー下の配線空間、実機動作は未検証です。シミュレーターではありません。
詳細は[対応範囲](docs/supported-scope.md)を参照してください。

## 検証とビルド

```sh
npm run verify
npx --no-install playwright install chromium
npm run test:browser
npm run build
```

`dist/playground/` に Playground と `/docs/` を含む静的ファイルを生成します。
HTTP で配信してください。ローカルのビルドだけでは公開されません。既存の GitHub Actions は
`main` の検証済み成果物を既存 Cloudflare Pages に自動公開します。npm パッケージは未公開です。
[early-preview リリースノート](docs/releases/v0.1.0-preview.1.md)も参照してください。
参加方法は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

[Cloudflare Pages 自動公開と管理者による初期設定](docs/cloudflare-pages.md)
