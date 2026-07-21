"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcNenreiKansan,
  calcShokujiryou,
  fmtNumber,
  RER_VALID_MIN_KG,
  RER_VALID_MAX_KG,
  DER_COEFFICIENT_DOG,
  DER_COEFFICIENT_CAT,
  type PetSpecies,
  type DogSize,
} from "./InunekoNenreiShokujiryou.calc";

/*
 * 犬猫の年齢換算＋食事量目安（P4-T05・P4-T06。需要検証枠。category=kaji・audience universal）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（calcNenreiKansan / calcShokujiryou）は InunekoNenreiShokujiryou.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 */

export function InunekoNenreiShokujiryou() {
  // --- 年齢換算 ---
  const [species, setSpecies] = useState<PetSpecies>("dog");
  const [size, setSize] = useState<DogSize>("shouChuugata");
  const [ageInput, setAgeInput] = useState("3");

  const effectiveSize: DogSize = species === "cat" ? "shouChuugata" : size;
  const parsedAge = ageInput === "" ? NaN : Number(ageInput);
  const nenreiResult = calcNenreiKansan(species, effectiveSize, parsedAge);

  // --- 食事量目安 ---
  const [weightInput, setWeightInput] = useState("5");
  const [meInput, setMeInput] = useState("");

  const parsedWeight = weightInput === "" ? NaN : Number(weightInput);
  const parsedMe = meInput === "" ? null : Number(meInput);
  const shokujiResult = calcShokujiryou(species, parsedWeight, parsedMe);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="犬・猫"
          value={species}
          onChange={(e) => setSpecies(e.target.value as PetSpecies)}
        >
          <option value="dog">犬</option>
          <option value="cat">猫</option>
        </SelectField>
        {species === "dog" && (
          <SelectField
            label="体格"
            value={size}
            onChange={(e) => setSize(e.target.value as DogSize)}
            hint="小型犬・中型犬は「小〜中型犬・猫」を選んでください"
          >
            <option value="shouChuugata">小〜中型犬</option>
            <option value="ougata">大型犬</option>
          </SelectField>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">年齢換算（人間年齢の目安）</h2>

        <NumberField
          label={`${species === "dog" ? "犬" : "猫"}の年齢（歳）`}
          value={ageInput}
          min={0}
          step="0.5"
          onChange={(e) => setAgeInput(e.target.value)}
          hint="1歳未満（生後1年未満）は出典に換算表・計算式がないため計算できません"
        />

        {!nenreiResult.ok && ageInput !== "" && (
          <Callout tone="caution">{nenreiResult.error}</Callout>
        )}

        {nenreiResult.ok && (
          <div className="space-y-3">
            <ResultCard
              label={`${nenreiResult.sizeLabel}・${nenreiResult.petAgeYears}歳の人間年齢の目安`}
              value={fmtNumber(nenreiResult.humanAgeYears)}
              unit="歳"
              note={`計算式: ${nenreiResult.formulaText}`}
            />
            {nenreiResult.isBeyondTableRange && (
              <Callout>
                出典の表に直接掲載されている年齢の範囲を超えています。同じ計算式をそのまま延長して算出した参考値です。
              </Callout>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-line pt-6">
        <h2 className="text-lg font-bold">1日の食事量の目安</h2>
        <Callout>
          この計算は<strong>避妊・去勢済みの成犬・成猫</strong>
          を対象にした環境省ガイドラインの計算例に基づきます。子犬・子猫、未避妊・未去勢、妊娠・授乳中、シニア期などは必要なエネルギー量の係数が異なりますが、原典に係数の表がないため本ツールでは扱いません（獣医師にご相談ください）。
        </Callout>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="体重（kg）"
            value={weightInput}
            min={RER_VALID_MIN_KG}
            max={RER_VALID_MAX_KG}
            step="0.1"
            onChange={(e) => setWeightInput(e.target.value)}
            hint={`計算式が有効なのは${RER_VALID_MIN_KG}〜${RER_VALID_MAX_KG}kgの範囲です（出典の注記）`}
          />
          <NumberField
            label="フードの代謝エネルギー（ME・kcal/100g）"
            value={meInput}
            min={0}
            step="1"
            onChange={(e) => setMeInput(e.target.value)}
            hint="任意入力。フードのパッケージ表示から確認できます（未入力でもRER・DERは計算します）"
          />
        </div>

        {!shokujiResult.ok && weightInput !== "" && (
          <Callout tone="caution">{shokujiResult.error}</Callout>
        )}

        {shokujiResult.ok && (
          <div className="space-y-4">
            {shokujiResult.feedAmountG !== null ? (
              <ResultCard
                label="1日当たりの食事量の目安"
                value={fmtNumber(shokujiResult.feedAmountG)}
                unit="g"
                note={`DER（1日当たりのエネルギー要求量） ${fmtNumber(shokujiResult.derKcal)}kcal ÷ 入力したME × 100`}
              />
            ) : (
              <ResultCard
                label="1日当たりのエネルギー要求量（DER）の目安"
                value={fmtNumber(shokujiResult.derKcal)}
                unit="kcal"
                note="フードのME（代謝エネルギー）を入力すると、グラム数の目安まで計算します"
              />
            )}

            <div className="rounded-card border border-line p-4 text-sm sm:text-base">
              <p className="font-medium">内訳</p>
              <ul className="mt-2 space-y-1 text-ink-muted">
                <li>安静時のエネルギー要求量（RER） = 体重{shokujiResult.weightKg}kg×30+70 = {fmtNumber(shokujiResult.rerKcal)}kcal</li>
                <li>
                  係数（{species === "dog" ? `犬・避妊去勢済み ${DER_COEFFICIENT_DOG}` : `猫・避妊去勢済み ${DER_COEFFICIENT_CAT}`}
                  ）を掛けたDER = {fmtNumber(shokujiResult.derKcal)}kcal
                </li>
              </ul>
            </div>
          </div>
        )}

        <Callout>
          まずはフードのパッケージに表示されている給餌量を目安にしてください。ここでの計算はあくまで参考値で、季節・運動量・体調によって必要な量は変わります。体重は現在の体重ではなく理想体重を使うのが望ましいとされており、理想体重が分からない場合は獣医師にご相談ください。
        </Callout>
      </section>
    </div>
  );
}
