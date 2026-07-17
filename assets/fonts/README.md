# OGP画像生成用フォント

`NotoSansJP-Bold-subset.otf` は Noto Sans CJK JP Bold（SIL Open Font License 1.1、
LICENSE-OFL.txt 参照）を、OGP画像のビルド時生成（next/og）用に軽量化したサブセットです。

- 収録: ASCII・かな・全角記号・常用漢字2,136字＋リポジトリ内コンテンツで使用中の全漢字（計約2,800グリフ）
- 用途: `app/**/opengraph-image.tsx` の ImageResponse のみ（クライアントには配信されない）
- 再生成: 新しい記事・ツールのタイトルに常用外の漢字を使って豆腐（□）になった場合のみ必要。
  `pip install fonttools` して
  `python -m fontTools.subset NotoSansCJKjp-Bold.otf --text-file=<使用文字一覧> --unicodes="U+0020-007E,U+3000-303F,U+3040-309F,U+30A0-30FF,U+FF00-FFEF" --output-file=NotoSansJP-Bold-subset.otf`
