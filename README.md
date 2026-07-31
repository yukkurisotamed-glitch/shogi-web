# 将棋 CPU 対戦 (Shogi vs CPU)

将棋のブラウザ対戦ゲームです。YaneuraOu K-P（SuishoPetite 評価関数内蔵）を WASM で動作させます。

## 機能

- 入門〜上級まで 12 段階の強さ設定
- YaneuraOu K-P（上級）/ 独自 Alpha-Beta AI（入門）
- 日本語・英語・中国語・韓国語・スペイン語対応
- 成り / 持ち駒 / 待った / 投了 対応

## 技術スタック

- Vite + Vanilla JS（フレームワークなし）
- [YaneuraOu.wasm](https://github.com/mizar/YaneuraOu.wasm) — GPL-3.0
- Firebase Hosting（`Cross-Origin-Embedder-Policy: credentialless` でデプロイ）

## ライセンス

GPL-3.0（YaneuraOu の GPL-3.0 に準拠）

## 設定が必要な箇所

### Etsy URL（物理セット販売ページ）

`index.html` 内の以下の箇所を実際の URL に変更してください：

```html
<a id="product-link" href="YOUR_ETSY_URL" ...>
```

### Firebase デプロイ

```bash
npm install
npx firebase login
npx firebase use --add   # Firebase プロジェクトを選択
npm run build
npx firebase deploy --only hosting
```

## ローカル開発

```bash
npm install
npm run dev
```
