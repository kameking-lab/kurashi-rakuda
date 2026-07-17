"use client";

import { useEffect, useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { todayJst } from "@/lib/tools/seido";
import {
  APPLICATION_REQUIRED_TEXT,
  calcKaigoShisetsuHiyou,
  fmtYen,
  roomOptionsFor,
  SHISETSU_TYPES,
  type ShisetsuKey,
} from "./KaigoShisetsuHiyouHayami.calc";

/*
 * 介護施設タイプ別 費用早見（紹介送客なし）（P2-T39）
 * specs/b-tools/p2-t39-kaigo-shisetsu-hiyou-hayami.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 *
 * ★このUIが絶対に置かないもの★
 *   特定の施設・事業者への誘導リンク、比較サイトへのリンク（docs/06_紹介ポリシー.md）。
 *   有料老人ホーム等（特定施設入居者生活介護）の費用は公的な相場データがないため金額を出さず、
 *   個々の施設の確認手段（介護サービス情報公表システム）は制度名のみをテキストで案内する
 *   （クリック可能なリンクにしない）。
 */

export function KaigoShisetsuHiyouHayami() {
  const [today, setToday] = useState<string | null>(null);
  const [shisetsuKey, setShisetsuKey] = useState<ShisetsuKey>("tokuyo");
  const [roomType, setRoomType] = useState("ユニット型個室");
  const [isShortStay, setIsShortStay] = useState(false);
  const [stageFilter, setStageFilter] = useState<"all" | "stage1" | "stage2" | "stage3a" | "stage3b" | "stage4">(
    "all",
  );

  useEffect(() => {
    setToday(todayJst());
  }, []);

  if (!today) {
    return <Callout>読み込み中です。</Callout>;
  }

  const options = roomOptionsFor(shisetsuKey);
  const effectiveRoomType = options.includes(roomType) ? roomType : options[0];

  const r = calcKaigoShisetsuHiyou({
    shisetsuKey,
    roomType: effectiveRoomType,
    isShortStay,
    today,
  });

  if (!r.ok) {
    return <Callout tone="caution">{r.error}</Callout>;
  }

  const displayLines = stageFilter === "all" ? r.lines : r.lines.filter((l) => l.stageKey === stageFilter);

  return (
    <div className="space-y-5">
      <SelectField
        label="施設タイプ"
        value={shisetsuKey}
        onChange={(e) => {
          const key = e.target.value as ShisetsuKey;
          setShisetsuKey(key);
          const nextOptions = roomOptionsFor(key);
          if (nextOptions.length > 0 && !nextOptions.includes(roomType)) {
            setRoomType(nextOptions[0]);
          }
        }}
      >
        {SHISETSU_TYPES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </SelectField>

      {r.shisetsu && (
        <div className="rounded-card border border-line p-4 text-sm sm:text-base">
          <p className="font-medium">{r.shisetsu.label}</p>
          <p className="mt-1 text-ink-muted">{r.shisetsu.character}</p>
          <p className="mt-2 text-ink-muted">{r.shisetsu.definition}</p>
          <p className="mt-1 text-ink-muted">
            根拠: {r.shisetsu.lawRef}（{r.shisetsu.serviceName}）
          </p>
        </div>
      )}

      {r.admissionRequirement && (
        <Callout>
          <p>
            <strong>{r.admissionRequirement.requiredLevelLabel}</strong>
            : {r.admissionRequirement.requiredLevelValue}
          </p>
          <p className="mt-1">{r.admissionRequirement.tokureiNyushoValue}</p>
        </Callout>
      )}

      {!r.hasCostData && r.minkan && (
        <>
          <Callout tone="caution">
            <p>
              <strong>民間施設の費用に公的な相場データはありません。</strong> {r.minkan.costNote}
            </p>
          </Callout>
          <Callout>
            <p>
              {r.shisetsu.label}
              は介護保険法上の「施設サービス」ではなく「居宅サービス」に分類されるため、食費・居住費の負担軽減制度（特定入所者介護サービス費・補足給付）の対象になりません。食費・居住費（家賃相当）は事業者が自由に設定し、原則として全額自己負担です。
            </p>
          </Callout>
          <div className="rounded-card border border-line p-4 text-sm">
            <p className="font-medium">個々の施設の費用を確認する方法</p>
            <p className="mt-1 text-ink-muted">
              {r.minkan.publicInfoSourceText}
              。特定の施設・事業者のご紹介は行っておりません。気になる施設が見つかった場合は、その施設に直接、重要事項説明書等で費用をご確認ください。
            </p>
          </div>
        </>
      )}

      {r.hasCostData && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="部屋タイプ" value={effectiveRoomType} onChange={(e) => setRoomType(e.target.value)}>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="短期入所（ショートステイ）ですか"
              value={isShortStay ? "yes" : "no"}
              hint="ショートステイは食費の負担限度額が別に定められています（居住費は同じ）"
              onChange={(e) => setIsShortStay(e.target.value === "yes")}
            >
              <option value="no">いいえ（入所）</option>
              <option value="yes">はい（短期入所）</option>
            </SelectField>
            <SelectField
              label="補足給付の所得段階（わからない場合は「すべて表示」）"
              value={stageFilter}
              hint="負担限度額認定を受けていない方・市町村民税課税世帯の方は「第4段階」（基準費用額を全額負担）に当たります"
              onChange={(e) =>
                setStageFilter(e.target.value as "all" | "stage1" | "stage2" | "stage3a" | "stage3b" | "stage4")
              }
            >
              <option value="all">すべて表示</option>
              <option value="stage1">第1段階</option>
              <option value="stage2">第2段階</option>
              <option value="stage3a">第3段階①</option>
              <option value="stage3b">第3段階②</option>
              <option value="stage4">第4段階（補足給付なし）</option>
            </SelectField>
          </div>

          <p className="text-sm text-ink-muted">{r.periodLabel}の負担限度額で計算しています。</p>

          {stageFilter !== "all" && displayLines[0] && (
            <ResultCard
              label={`${displayLines[0].stageLabel}・${effectiveRoomType}の1か月（30日）の食費・居住費の目安`}
              value={fmtYen(displayLines[0].monthlyTotal30Days)}
              unit="円"
              note={`食費 ${fmtYen(displayLines[0].shokuhiPerDay)}円/日 ＋ 居住費 ${fmtYen(
                displayLines[0].kyojuhiPerDay,
              )}円/日`}
            />
          )}

          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">
                {effectiveRoomType}の所得段階別 食費・居住費の負担限度額（1か月30日換算）
              </caption>
              <thead>
                <tr className="border-b border-line bg-sand-soft">
                  <th className="p-2 font-medium">所得段階</th>
                  <th className="p-2 font-medium">食費/日</th>
                  <th className="p-2 font-medium">居住費/日</th>
                  <th className="p-2 font-medium">1か月目安（30日）</th>
                </tr>
              </thead>
              <tbody>
                {displayLines.map((l) => (
                  <tr key={l.stageKey} className="border-b border-line last:border-0">
                    <td className="p-2">
                      {l.stageLabel}
                      {l.stageKey === "stage4" && "（補足給付なし）"}
                    </td>
                    <td className="p-2 tabular-nums">{fmtYen(l.shokuhiPerDay)}円</td>
                    <td className="p-2 tabular-nums">{fmtYen(l.kyojuhiPerDay)}円</td>
                    <td className="p-2 tabular-nums font-bold">{fmtYen(l.monthlyTotal30Days)}円</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Callout>
            <p>
              上の金額は<strong>食費・居住費だけ</strong>
              の目安です。これとは別に、施設サービス費の自己負担（1〜3割）・日常生活費（理美容代等）・各種加算がかかります。施設サービス費の自己負担や高額介護サービス費の払い戻しまで含めて試算したい場合は、「介護保険
              自己負担シミュレーター」をあわせてご利用ください。
            </p>
          </Callout>

          {r.monthlyExamples && (
            <div className="rounded-card border border-line p-4 text-sm text-ink-muted">
              <p className="font-medium text-ink">厚生労働省が示す月額の目安（第4段階の例）</p>
              <p className="mt-2">{r.monthlyExamples.multiBed}</p>
              <p className="mt-2">{r.monthlyExamples.unit}</p>
            </div>
          )}

          <Callout tone="caution">
            <p>{APPLICATION_REQUIRED_TEXT}</p>
          </Callout>
        </>
      )}

      <Callout>
        本ページの内容は法令・告示に基づく目安であり、実際にかかる費用を保証するものではありません。個別の判断は、担当のケアマネジャー・お住まいの市区町村・地域包括支援センター、および入居を検討する施設に直接ご確認ください。
      </Callout>
    </div>
  );
}
