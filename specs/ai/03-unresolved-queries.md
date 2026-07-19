# AI-5. 未解決クエリの蓄積と閲覧（開発ネタの資産化）

親設計: docs/16_AI連携設計.md §3。保存先: Supabase 無料枠（閲覧 UI を自前実装しないための選定）。

## 1. セットアップ SQL（社長が Supabase SQL エディタに貼る全文）

```sql
create table unresolved_queries (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('search','consult')),
  query_text text not null check (char_length(query_text) <= 500),
  matched boolean not null default false,
  created_on date not null default current_date
);
alter table unresolved_queries enable row level security;
-- ポリシーは作らない（= anon からは読み書き不可。service_role キーのみが操作できる）

create view query_themes as
select query_text, kind, count(*) as n,
       min(created_on) as first_seen, max(created_on) as last_seen
from unresolved_queries
group by query_text, kind
order by n desc;
```

## 2. 書き込み規約（API 実装側）

- 記録するのは §docs/16 の4項目のみ。IP・UA・プロフィール・詳細時刻を**カラムとして持たない**（スキーマで物理的に不可能にする）
- 書き込み失敗は握りつぶしてユーザー応答を優先（蓄積はベストエフォート）

## 3. 社長の閲覧手順（週1目安）

1. Supabase ダッシュボード → 対象プロジェクト → Table Editor → `query_themes`
2. n（件数）降順が「求められているのにまだない機能」ランキング。CSV エクスポート可
3. 開発ネタに昇格するものは BACKLOG の P4 以降に起票（司令塔へ依頼で可）

## 4. 掃除

- 年 1 回、1 年超のレコードを削除（`delete from unresolved_queries where created_on < now() - interval '1 year';`）。個人情報を持たないため保持リスクは低いが、無料枠容量の衛生として実施
