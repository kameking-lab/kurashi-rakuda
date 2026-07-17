"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcShinchoYosoku,
  FATHER_HEIGHT_MAX,
  FATHER_HEIGHT_MIN,
  MOTHER_HEIGHT_MAX,
  MOTHER_HEIGHT_MIN,
  type ShinchoSex,
} from "./ShinchoYosoku.calc";

/*
 * 子どもの身長予測（両親身長法・Q3-10）。
 * 父親・母親の身長と子の性別から、成人時の予測身長の目安を即時計算する。
 * すべてクライアント内で計算し、送信・登録は行わない（docs/05 §1-4）。
 * 統計的な経験式による目安であり、断定的な予測ではない（YMYL配慮）。
 * 医学的な低身長・成長障害の診断や判定は一切行わない。
 */

export function ShinchoYosoku() {
  const [sex, setSex] = useState<ShinchoSex | "">("");
  const [fatherHeight, setFatherHeight] = useState("");
  const [motherHeight, setMotherHeight] = useState("");

  const fatherHeightNum = fatherHeight === "" ? null : Number(fatherHeight);
  const motherHeightNum = motherHeight === "" ? null : Number(motherHeight);

  const hasAllInputs = sex !== "" && fatherHeight !== "" && motherHeight !== "";

  const result = hasAllInputs
    ? calcShinchoYosoku({
        sex,
        fatherHeightCm: fatherHeightNum,
        motherHeightCm: motherHeightNum,
      })
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="子の性別"
          value={sex}
          onChange={(e) => setSex(e.target.value as ShinchoSex | "")}
        >
          <option value="">選択してください</option>
          <option value="male">男児</option>
          <option value="female">女児</option>
        </SelectField>
        <NumberField
          label="父親の身長（cm）"
          value={fatherHeight}
          min={FATHER_HEIGHT_MIN}
          max={FATHER_HEIGHT_MAX}
          step="0.1"
          onChange={(e) => setFatherHeight(e.target.value)}
          hint="わかる範囲で構いません。無理に埋める必要はありません"
        />
        <NumberField
          label="母親の身長（cm）"
          value={motherHeight}
          min={MOTHER_HEIGHT_MIN}
          max={MOTHER_HEIGHT_MAX}
          step="0.1"
          onChange={(e) => setMotherHeight(e.target.value)}
          hint="わかる範囲で構いません。無理に埋める必要はありません"
        />
      </div>

      {!result ? (
        <Callout>
          父親・母親の身長と子の性別を入れると、その場で予測身長の目安を計算します。
        </Callout>
      ) : !result.ok ? (
        <Callout tone="caution">{result.message}</Callout>
      ) : (
        <>
          <ResultCard
            label="予測身長（目安）"
            value={`${result.predictedHeightCm}`}
            unit="cm前後"
            note={`参考レンジ: ${result.rangeLowCm}cm 〜 ${result.rangeHighCm}cm（±9cm程度の目安）`}
          />
          {result.extremeInputNotice && (
            <Callout tone="caution">
              入力された身長が極端に大きいか、父親・母親の身長差が大きいため、結果が実際の傾向から離れる可能性があります。入力値をご確認ください。
            </Callout>
          )}
          <Callout tone="caution">
            この結果は両親の身長から計算した統計的な目安であり、実際の身長を保証するものではありません。栄養・睡眠・運動・個人差など様々な要因で変化します。成長について心配な場合は、乳幼児健診や小児科医にご相談ください。
          </Callout>
        </>
      )}
    </div>
  );
}
