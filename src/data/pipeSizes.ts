// 재질별 관경 치수표
// 원본 엑셀 데이터: 냉온수배관관경결정프로그램7.1.xlsx 의 시트 "관경결정표"
// V2 신규: 재질 → 두께규격(Schedule) → 호칭경 3단계 구조
//
// 출처 요약:
//   탄소강관 KS일반:      KS D 3507 (배관용 탄소강관) — 엑셀 원본 데이터 유지
//   탄소강관 Sch40/80:    ANSI B36.10M (Welded and Seamless Wrought Steel Pipe)
//   스테인리스 5S/10S/40S: ANSI B36.19M (Stainless Steel Pipe)
//   동관 K/L/M:           ASTM B88 (Seamless Copper Water Tube)
//   PVC/C-PVC Sch40/80:  ASTM D1785 (PVC Plastic Pipe) / ASTM F441 (C-PVC Sch80)

// ── V2 타입 정의 ────────────────────────────────────────────────────

export type ScheduleId =
  | 'ks-std'    // 탄소강관 KS일반 (KS D 3507)
  | 'sch40'     // 탄소강관 Sch40 (ANSI B36.10M)
  | 'sch80'     // 탄소강관 Sch80 (ANSI B36.10M)
  | 'ss-5s'    // 스테인리스 5S (ANSI B36.19M)
  | 'ss-10s'   // 스테인리스 10S (ANSI B36.19M)
  | 'ss-40s'   // 스테인리스 40S (ANSI B36.19M)
  | 'cu-k'     // 동관 Type K (ASTM B88)
  | 'cu-l'     // 동관 Type L (ASTM B88)
  | 'cu-m'     // 동관 Type M (ASTM B88)
  | 'pvc-sch40' // PVC/C-PVC Sch40 (ASTM D1785)
  | 'pvc-sch80'; // PVC/C-PVC Sch80 (ASTM D1785 / F441)

export interface PipeSize {
  nominalA: number;    // 호칭경 A
  nominalDN?: number;  // 호칭 DN (옵션)
  od_mm: number;       // 외경
  t_mm: number;        // 두께
  id_mm: number;       // 내경 = od_mm - 2 * t_mm
}

export interface ScheduleSpec {
  id: ScheduleId;
  label: string;       // 'KS일반', 'Sch40', 'Type K' 등
  sizes: PipeSize[];
}

export interface MaterialSpec {
  id: string;          // 'sgp', 'stainless', 'copper', 'pvc'
  label: string;       // '탄소강관' 등
  schedules: ScheduleSpec[];
}

// ── 탄소강관 KS일반 (KS D 3507) ────────────────────────────────────
// 출처: KS D 3507:2020 (배관용 탄소강관) Table 1
// 엑셀 원본 AC28:AE47 데이터와 동일. OD/t 기준, id_mm = od_mm - 2*t_mm
// https://www.kssn.net (한국산업표준 KS D 3507)
const SGP_KS_STD: PipeSize[] = [
  // 출처: KS D 3507 Table 1 — OD 21.7mm, t 2.65mm
  { nominalA: 15,  od_mm: 21.7,  t_mm: 2.65, id_mm: 21.7  - 2 * 2.65 },
  // 출처: KS D 3507 Table 1 — OD 27.2mm, t 2.65mm
  { nominalA: 20,  od_mm: 27.2,  t_mm: 2.65, id_mm: 27.2  - 2 * 2.65 },
  // 출처: KS D 3507 Table 1 — OD 34.0mm, t 3.25mm
  { nominalA: 25,  od_mm: 34.0,  t_mm: 3.25, id_mm: 34.0  - 2 * 3.25 },
  // 출처: KS D 3507 Table 1 — OD 42.7mm, t 3.25mm
  { nominalA: 32,  od_mm: 42.7,  t_mm: 3.25, id_mm: 42.7  - 2 * 3.25 },
  // 출처: KS D 3507 Table 1 — OD 48.6mm, t 3.25mm
  { nominalA: 40,  od_mm: 48.6,  t_mm: 3.25, id_mm: 48.6  - 2 * 3.25 },
  // 출처: KS D 3507 Table 1 — OD 60.5mm, t 3.65mm
  { nominalA: 50,  od_mm: 60.5,  t_mm: 3.65, id_mm: 60.5  - 2 * 3.65 },
  // 출처: KS D 3507 Table 1 — OD 76.3mm, t 3.65mm
  { nominalA: 65,  od_mm: 76.3,  t_mm: 3.65, id_mm: 76.3  - 2 * 3.65 },
  // 출처: KS D 3507 Table 1 — OD 89.1mm, t 4.05mm
  { nominalA: 80,  od_mm: 89.1,  t_mm: 4.05, id_mm: 89.1  - 2 * 4.05 },
  // 출처: KS D 3507 Table 1 — OD 114.3mm, t 4.5mm
  { nominalA: 100, od_mm: 114.3, t_mm: 4.5,  id_mm: 114.3 - 2 * 4.5  },
  // 출처: KS D 3507 Table 1 — OD 139.8mm, t 4.85mm
  { nominalA: 125, od_mm: 139.8, t_mm: 4.85, id_mm: 139.8 - 2 * 4.85 },
  // 출처: KS D 3507 Table 1 — OD 166.2mm, t 4.85mm
  { nominalA: 150, od_mm: 166.2, t_mm: 4.85, id_mm: 166.2 - 2 * 4.85 },
  // 출처: KS D 3507 Table 1 — OD 216.5mm, t 5.85mm
  { nominalA: 200, od_mm: 216.5, t_mm: 5.85, id_mm: 216.5 - 2 * 5.85 },
  // 출처: KS D 3507 Table 1 — OD 267.4mm, t 6.4mm
  { nominalA: 250, od_mm: 267.4, t_mm: 6.4,  id_mm: 267.4 - 2 * 6.4  },
  // 출처: KS D 3507 Table 1 — OD 318.5mm, t 7.0mm
  { nominalA: 300, od_mm: 318.5, t_mm: 7.0,  id_mm: 318.5 - 2 * 7.0  },
  // 출처: KS D 3507 Table 1 — OD 355.6mm, t 7.6mm
  { nominalA: 350, od_mm: 355.6, t_mm: 7.6,  id_mm: 355.6 - 2 * 7.6  },
  // 출처: KS D 3507 Table 1 — OD 406.4mm, t 7.9mm
  { nominalA: 400, od_mm: 406.4, t_mm: 7.9,  id_mm: 406.4 - 2 * 7.9  },
  // 출처: KS D 3507 Table 1 — OD 457.2mm, t 7.9mm
  { nominalA: 450, od_mm: 457.2, t_mm: 7.9,  id_mm: 457.2 - 2 * 7.9  },
  // 출처: KS D 3507 Table 1 — OD 508.0mm, t 7.9mm
  { nominalA: 500, od_mm: 508.0, t_mm: 7.9,  id_mm: 508.0 - 2 * 7.9  },
  // 출처: KS D 3507 Table 1 — OD 558.8mm, t 7.9mm
  { nominalA: 550, od_mm: 558.8, t_mm: 7.9,  id_mm: 558.8 - 2 * 7.9  },
  // 출처: KS D 3507 Table 1 — OD 609.6mm, t 7.9mm
  { nominalA: 600, od_mm: 609.6, t_mm: 7.9,  id_mm: 609.6 - 2 * 7.9  },
];

// ── 탄소강관 Sch40 (ANSI B36.10M) ──────────────────────────────────
// 출처: ANSI/ASME B36.10M-2015 (Welded and Seamless Wrought Steel Pipe), Table 1 Schedule 40
// https://www.asme.org/codes-standards/find-codes-standards/b36-10m-welded-seamless-wrought-steel-pipe
// 비고: 15A(1/2")~200A(8") 범위 — Sch40 is same as Std weight for sizes ≤300A
const SGP_SCH40: PipeSize[] = [
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 1/2, OD 21.34mm, t 2.77mm
  { nominalA: 15,  od_mm: 21.34, t_mm: 2.77, id_mm: 21.34 - 2 * 2.77 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 3/4, OD 26.67mm, t 2.87mm
  { nominalA: 20,  od_mm: 26.67, t_mm: 2.87, id_mm: 26.67 - 2 * 2.87 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 1, OD 33.40mm, t 3.38mm
  { nominalA: 25,  od_mm: 33.40, t_mm: 3.38, id_mm: 33.40 - 2 * 3.38 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 1-1/4, OD 42.16mm, t 3.56mm
  { nominalA: 32,  od_mm: 42.16, t_mm: 3.56, id_mm: 42.16 - 2 * 3.56 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 1-1/2, OD 48.26mm, t 3.68mm
  { nominalA: 40,  od_mm: 48.26, t_mm: 3.68, id_mm: 48.26 - 2 * 3.68 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 2, OD 60.33mm, t 3.91mm
  { nominalA: 50,  od_mm: 60.33, t_mm: 3.91, id_mm: 60.33 - 2 * 3.91 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 2-1/2, OD 73.03mm, t 5.16mm
  { nominalA: 65,  od_mm: 73.03, t_mm: 5.16, id_mm: 73.03 - 2 * 5.16 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 3, OD 88.90mm, t 5.49mm
  { nominalA: 80,  od_mm: 88.90, t_mm: 5.49, id_mm: 88.90 - 2 * 5.49 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 4, OD 114.30mm, t 6.02mm
  { nominalA: 100, od_mm: 114.30, t_mm: 6.02, id_mm: 114.30 - 2 * 6.02 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 5, OD 141.30mm, t 6.55mm
  { nominalA: 125, od_mm: 141.30, t_mm: 6.55, id_mm: 141.30 - 2 * 6.55 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 6, OD 168.28mm, t 7.11mm
  { nominalA: 150, od_mm: 168.28, t_mm: 7.11, id_mm: 168.28 - 2 * 7.11 },
  // 출처: ANSI B36.10M Table 1 Sch40 — NPS 8, OD 219.08mm, t 8.18mm
  { nominalA: 200, od_mm: 219.08, t_mm: 8.18, id_mm: 219.08 - 2 * 8.18 },
];

// ── 탄소강관 Sch80 (ANSI B36.10M) ──────────────────────────────────
// 출처: ANSI/ASME B36.10M-2015 Table 1 Schedule 80
// https://www.asme.org/codes-standards/find-codes-standards/b36-10m-welded-seamless-wrought-steel-pipe
// 비고: 실무상 Sch80은 200A(8") 이하 주로 사용
const SGP_SCH80: PipeSize[] = [
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 1/2, OD 21.34mm, t 3.73mm
  { nominalA: 15,  od_mm: 21.34, t_mm: 3.73, id_mm: 21.34 - 2 * 3.73 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 3/4, OD 26.67mm, t 3.91mm
  { nominalA: 20,  od_mm: 26.67, t_mm: 3.91, id_mm: 26.67 - 2 * 3.91 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 1, OD 33.40mm, t 4.55mm
  { nominalA: 25,  od_mm: 33.40, t_mm: 4.55, id_mm: 33.40 - 2 * 4.55 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 1-1/4, OD 42.16mm, t 4.85mm
  { nominalA: 32,  od_mm: 42.16, t_mm: 4.85, id_mm: 42.16 - 2 * 4.85 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 1-1/2, OD 48.26mm, t 5.08mm
  { nominalA: 40,  od_mm: 48.26, t_mm: 5.08, id_mm: 48.26 - 2 * 5.08 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 2, OD 60.33mm, t 5.54mm
  { nominalA: 50,  od_mm: 60.33, t_mm: 5.54, id_mm: 60.33 - 2 * 5.54 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 2-1/2, OD 73.03mm, t 7.01mm
  { nominalA: 65,  od_mm: 73.03, t_mm: 7.01, id_mm: 73.03 - 2 * 7.01 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 3, OD 88.90mm, t 7.62mm
  { nominalA: 80,  od_mm: 88.90, t_mm: 7.62, id_mm: 88.90 - 2 * 7.62 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 4, OD 114.30mm, t 8.56mm
  { nominalA: 100, od_mm: 114.30, t_mm: 8.56, id_mm: 114.30 - 2 * 8.56 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 5, OD 141.30mm, t 9.53mm
  { nominalA: 125, od_mm: 141.30, t_mm: 9.53, id_mm: 141.30 - 2 * 9.53 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 6, OD 168.28mm, t 10.97mm
  { nominalA: 150, od_mm: 168.28, t_mm: 10.97, id_mm: 168.28 - 2 * 10.97 },
  // 출처: ANSI B36.10M Table 1 Sch80 — NPS 8, OD 219.08mm, t 12.70mm
  { nominalA: 200, od_mm: 219.08, t_mm: 12.70, id_mm: 219.08 - 2 * 12.70 },
];

// ── 스테인리스강관 5S (ANSI B36.19M) ───────────────────────────────
// 출처: ANSI/ASME B36.19M-2004 (Stainless Steel Pipe), Table 1 Schedule 5S
// https://www.asme.org/codes-standards/find-codes-standards/b36-19m-stainless-steel-pipe
const STS_5S: PipeSize[] = [
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 1/2, OD 21.34mm, t 1.65mm
  { nominalA: 15,  od_mm: 21.34, t_mm: 1.65, id_mm: 21.34 - 2 * 1.65 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 3/4, OD 26.67mm, t 1.65mm
  { nominalA: 20,  od_mm: 26.67, t_mm: 1.65, id_mm: 26.67 - 2 * 1.65 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 1, OD 33.40mm, t 1.65mm
  { nominalA: 25,  od_mm: 33.40, t_mm: 1.65, id_mm: 33.40 - 2 * 1.65 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 1-1/4, OD 42.16mm, t 1.65mm
  { nominalA: 32,  od_mm: 42.16, t_mm: 1.65, id_mm: 42.16 - 2 * 1.65 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 1-1/2, OD 48.26mm, t 1.65mm
  { nominalA: 40,  od_mm: 48.26, t_mm: 1.65, id_mm: 48.26 - 2 * 1.65 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 2, OD 60.33mm, t 1.65mm
  { nominalA: 50,  od_mm: 60.33, t_mm: 1.65, id_mm: 60.33 - 2 * 1.65 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 2-1/2, OD 73.03mm, t 2.11mm
  { nominalA: 65,  od_mm: 73.03, t_mm: 2.11, id_mm: 73.03 - 2 * 2.11 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 3, OD 88.90mm, t 2.11mm
  { nominalA: 80,  od_mm: 88.90, t_mm: 2.11, id_mm: 88.90 - 2 * 2.11 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 4, OD 114.30mm, t 2.11mm
  { nominalA: 100, od_mm: 114.30, t_mm: 2.11, id_mm: 114.30 - 2 * 2.11 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 5, OD 141.30mm, t 2.77mm
  { nominalA: 125, od_mm: 141.30, t_mm: 2.77, id_mm: 141.30 - 2 * 2.77 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 6, OD 168.28mm, t 2.77mm
  { nominalA: 150, od_mm: 168.28, t_mm: 2.77, id_mm: 168.28 - 2 * 2.77 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 8, OD 219.08mm, t 2.77mm
  { nominalA: 200, od_mm: 219.08, t_mm: 2.77, id_mm: 219.08 - 2 * 2.77 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 10, OD 273.05mm, t 3.40mm
  { nominalA: 250, od_mm: 273.05, t_mm: 3.40, id_mm: 273.05 - 2 * 3.40 },
  // 출처: ANSI B36.19M Table 1 Sch5S — NPS 12, OD 323.85mm, t 3.96mm
  { nominalA: 300, od_mm: 323.85, t_mm: 3.96, id_mm: 323.85 - 2 * 3.96 },
];

// ── 스테인리스강관 10S (ANSI B36.19M) ──────────────────────────────
// 출처: ANSI/ASME B36.19M-2004 Table 1 Schedule 10S
// 엑셀 원본 X51:Z64 데이터 (KS D 3576 기준) — od_mm 동일, t_mm 역산
// https://www.asme.org/codes-standards/find-codes-standards/b36-19m-stainless-steel-pipe
const STS_10S: PipeSize[] = [
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 1/2, OD 21.34mm, t 2.11mm
  { nominalA: 15,  od_mm: 21.34, t_mm: 2.11, id_mm: 21.34 - 2 * 2.11 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 3/4, OD 26.67mm, t 2.11mm
  { nominalA: 20,  od_mm: 26.67, t_mm: 2.11, id_mm: 26.67 - 2 * 2.11 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 1, OD 33.40mm, t 2.77mm
  { nominalA: 25,  od_mm: 33.40, t_mm: 2.77, id_mm: 33.40 - 2 * 2.77 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 1-1/4, OD 42.16mm, t 2.77mm
  { nominalA: 32,  od_mm: 42.16, t_mm: 2.77, id_mm: 42.16 - 2 * 2.77 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 1-1/2, OD 48.26mm, t 2.77mm
  { nominalA: 40,  od_mm: 48.26, t_mm: 2.77, id_mm: 48.26 - 2 * 2.77 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 2, OD 60.33mm, t 2.77mm
  { nominalA: 50,  od_mm: 60.33, t_mm: 2.77, id_mm: 60.33 - 2 * 2.77 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 2-1/2, OD 73.03mm, t 3.05mm
  { nominalA: 65,  od_mm: 73.03, t_mm: 3.05, id_mm: 73.03 - 2 * 3.05 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 3, OD 88.90mm, t 3.05mm
  { nominalA: 80,  od_mm: 88.90, t_mm: 3.05, id_mm: 88.90 - 2 * 3.05 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 4, OD 114.30mm, t 3.05mm
  { nominalA: 100, od_mm: 114.30, t_mm: 3.05, id_mm: 114.30 - 2 * 3.05 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 5, OD 141.30mm, t 3.40mm
  { nominalA: 125, od_mm: 141.30, t_mm: 3.40, id_mm: 141.30 - 2 * 3.40 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 6, OD 168.28mm, t 3.40mm
  { nominalA: 150, od_mm: 168.28, t_mm: 3.40, id_mm: 168.28 - 2 * 3.40 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 8, OD 219.08mm, t 3.76mm
  { nominalA: 200, od_mm: 219.08, t_mm: 3.76, id_mm: 219.08 - 2 * 3.76 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 10, OD 273.05mm, t 4.19mm
  { nominalA: 250, od_mm: 273.05, t_mm: 4.19, id_mm: 273.05 - 2 * 4.19 },
  // 출처: ANSI B36.19M Table 1 Sch10S — NPS 12, OD 323.85mm, t 4.57mm
  { nominalA: 300, od_mm: 323.85, t_mm: 4.57, id_mm: 323.85 - 2 * 4.57 },
];

// ── 스테인리스강관 40S (ANSI B36.19M) ──────────────────────────────
// 출처: ANSI/ASME B36.19M-2004 Table 1 Schedule 40S
// 비고: Sch40S = Sch40 (ANSI B36.10M Sch40와 동일 치수)
// https://www.asme.org/codes-standards/find-codes-standards/b36-19m-stainless-steel-pipe
const STS_40S: PipeSize[] = [
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 1/2, OD 21.34mm, t 2.77mm
  { nominalA: 15,  od_mm: 21.34, t_mm: 2.77, id_mm: 21.34 - 2 * 2.77 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 3/4, OD 26.67mm, t 2.87mm
  { nominalA: 20,  od_mm: 26.67, t_mm: 2.87, id_mm: 26.67 - 2 * 2.87 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 1, OD 33.40mm, t 3.38mm
  { nominalA: 25,  od_mm: 33.40, t_mm: 3.38, id_mm: 33.40 - 2 * 3.38 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 1-1/4, OD 42.16mm, t 3.56mm
  { nominalA: 32,  od_mm: 42.16, t_mm: 3.56, id_mm: 42.16 - 2 * 3.56 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 1-1/2, OD 48.26mm, t 3.68mm
  { nominalA: 40,  od_mm: 48.26, t_mm: 3.68, id_mm: 48.26 - 2 * 3.68 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 2, OD 60.33mm, t 3.91mm
  { nominalA: 50,  od_mm: 60.33, t_mm: 3.91, id_mm: 60.33 - 2 * 3.91 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 2-1/2, OD 73.03mm, t 5.16mm
  { nominalA: 65,  od_mm: 73.03, t_mm: 5.16, id_mm: 73.03 - 2 * 5.16 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 3, OD 88.90mm, t 5.49mm
  { nominalA: 80,  od_mm: 88.90, t_mm: 5.49, id_mm: 88.90 - 2 * 5.49 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 4, OD 114.30mm, t 6.02mm
  { nominalA: 100, od_mm: 114.30, t_mm: 6.02, id_mm: 114.30 - 2 * 6.02 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 5, OD 141.30mm, t 6.55mm
  { nominalA: 125, od_mm: 141.30, t_mm: 6.55, id_mm: 141.30 - 2 * 6.55 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 6, OD 168.28mm, t 7.11mm
  { nominalA: 150, od_mm: 168.28, t_mm: 7.11, id_mm: 168.28 - 2 * 7.11 },
  // 출처: ANSI B36.19M Table 1 Sch40S — NPS 8, OD 219.08mm, t 8.18mm
  { nominalA: 200, od_mm: 219.08, t_mm: 8.18, id_mm: 219.08 - 2 * 8.18 },
];

// ── 동관 Type K (ASTM B88) ─────────────────────────────────────────
// 출처: ASTM B88-16 (Seamless Copper Water Tube) Table 1 Type K
// https://www.astm.org/b0088-16.html
const COPPER_TYPE_K: PipeSize[] = [
  // 출처: ASTM B88 Table 1 Type K — 1/2", OD 15.88mm, t 1.24mm
  { nominalA: 15,  od_mm: 15.88, t_mm: 1.24, id_mm: 15.88 - 2 * 1.24 },
  // 출처: ASTM B88 Table 1 Type K — 3/4", OD 22.23mm, t 1.65mm
  { nominalA: 20,  od_mm: 22.23, t_mm: 1.65, id_mm: 22.23 - 2 * 1.65 },
  // 출처: ASTM B88 Table 1 Type K — 1", OD 28.58mm, t 1.65mm
  { nominalA: 25,  od_mm: 28.58, t_mm: 1.65, id_mm: 28.58 - 2 * 1.65 },
  // 출처: ASTM B88 Table 1 Type K — 1-1/4", OD 34.93mm, t 1.83mm
  { nominalA: 32,  od_mm: 34.93, t_mm: 1.83, id_mm: 34.93 - 2 * 1.83 },
  // 출처: ASTM B88 Table 1 Type K — 1-1/2", OD 41.28mm, t 2.03mm
  { nominalA: 40,  od_mm: 41.28, t_mm: 2.03, id_mm: 41.28 - 2 * 2.03 },
  // 출처: ASTM B88 Table 1 Type K — 2", OD 53.98mm, t 2.41mm
  { nominalA: 50,  od_mm: 53.98, t_mm: 2.41, id_mm: 53.98 - 2 * 2.41 },
  // 출처: ASTM B88 Table 1 Type K — 2-1/2", OD 66.68mm, t 2.77mm
  { nominalA: 65,  od_mm: 66.68, t_mm: 2.77, id_mm: 66.68 - 2 * 2.77 },
  // 출처: ASTM B88 Table 1 Type K — 3", OD 79.38mm, t 3.18mm
  { nominalA: 80,  od_mm: 79.38, t_mm: 3.18, id_mm: 79.38 - 2 * 3.18 },
  // 출처: ASTM B88 Table 1 Type K — 4", OD 104.78mm, t 3.56mm
  { nominalA: 100, od_mm: 104.78, t_mm: 3.56, id_mm: 104.78 - 2 * 3.56 },
  // 출처: ASTM B88 Table 1 Type K — 5", OD 130.18mm, t 4.06mm
  { nominalA: 125, od_mm: 130.18, t_mm: 4.06, id_mm: 130.18 - 2 * 4.06 },
  // 출처: ASTM B88 Table 1 Type K — 6", OD 155.58mm, t 4.88mm
  { nominalA: 150, od_mm: 155.58, t_mm: 4.88, id_mm: 155.58 - 2 * 4.88 },
  // 출처: ASTM B88 Table 1 Type K — 8", OD 206.38mm, t 6.35mm
  { nominalA: 200, od_mm: 206.38, t_mm: 6.35, id_mm: 206.38 - 2 * 6.35 },
];

// ── 동관 Type L (ASTM B88) ─────────────────────────────────────────
// 출처: ASTM B88-16 (Seamless Copper Water Tube) Table 1 Type L
// https://www.astm.org/b0088-16.html
// 엑셀 원본 데이터와 동일 (기존 COPPER_TYPE_L_SIZES)
const COPPER_TYPE_L: PipeSize[] = [
  // 출처: ASTM B88 Table 1 Type L — 1/2", OD 15.88mm, t 1.02mm
  { nominalA: 15,  od_mm: 15.88, t_mm: 1.02, id_mm: 15.88 - 2 * 1.02 },
  // 출처: ASTM B88 Table 1 Type L — 3/4", OD 22.23mm, t 1.14mm
  { nominalA: 20,  od_mm: 22.23, t_mm: 1.14, id_mm: 22.23 - 2 * 1.14 },
  // 출처: ASTM B88 Table 1 Type L — 1", OD 28.58mm, t 1.27mm
  { nominalA: 25,  od_mm: 28.58, t_mm: 1.27, id_mm: 28.58 - 2 * 1.27 },
  // 출처: ASTM B88 Table 1 Type L — 1-1/4", OD 34.93mm, t 1.40mm
  { nominalA: 32,  od_mm: 34.93, t_mm: 1.40, id_mm: 34.93 - 2 * 1.40 },
  // 출처: ASTM B88 Table 1 Type L — 1-1/2", OD 41.28mm, t 1.52mm
  { nominalA: 40,  od_mm: 41.28, t_mm: 1.52, id_mm: 41.28 - 2 * 1.52 },
  // 출처: ASTM B88 Table 1 Type L — 2", OD 53.98mm, t 1.78mm
  { nominalA: 50,  od_mm: 53.98, t_mm: 1.78, id_mm: 53.98 - 2 * 1.78 },
  // 출처: ASTM B88 Table 1 Type L — 2-1/2", OD 66.68mm, t 2.03mm
  { nominalA: 65,  od_mm: 66.68, t_mm: 2.03, id_mm: 66.68 - 2 * 2.03 },
  // 출처: ASTM B88 Table 1 Type L — 3", OD 79.38mm, t 2.29mm
  { nominalA: 80,  od_mm: 79.38, t_mm: 2.29, id_mm: 79.38 - 2 * 2.29 },
  // 출처: ASTM B88 Table 1 Type L — 4", OD 104.78mm, t 2.79mm
  { nominalA: 100, od_mm: 104.78, t_mm: 2.79, id_mm: 104.78 - 2 * 2.79 },
  // 출처: ASTM B88 Table 1 Type L — 5", OD 130.18mm, t 3.18mm
  { nominalA: 125, od_mm: 130.18, t_mm: 3.18, id_mm: 130.18 - 2 * 3.18 },
  // 출처: ASTM B88 Table 1 Type L — 6", OD 155.58mm, t 3.56mm
  { nominalA: 150, od_mm: 155.58, t_mm: 3.56, id_mm: 155.58 - 2 * 3.56 },
  // 출처: ASTM B88 Table 1 Type L — 8", OD 206.38mm, t 5.08mm
  { nominalA: 200, od_mm: 206.38, t_mm: 5.08, id_mm: 206.38 - 2 * 5.08 },
];

// ── 동관 Type M (ASTM B88) ─────────────────────────────────────────
// 출처: ASTM B88-16 (Seamless Copper Water Tube) Table 1 Type M
// https://www.astm.org/b0088-16.html
const COPPER_TYPE_M: PipeSize[] = [
  // 출처: ASTM B88 Table 1 Type M — 1/2", OD 15.88mm, t 0.71mm
  { nominalA: 15,  od_mm: 15.88, t_mm: 0.71, id_mm: 15.88 - 2 * 0.71 },
  // 출처: ASTM B88 Table 1 Type M — 3/4", OD 22.23mm, t 0.89mm
  { nominalA: 20,  od_mm: 22.23, t_mm: 0.89, id_mm: 22.23 - 2 * 0.89 },
  // 출처: ASTM B88 Table 1 Type M — 1", OD 28.58mm, t 0.89mm
  { nominalA: 25,  od_mm: 28.58, t_mm: 0.89, id_mm: 28.58 - 2 * 0.89 },
  // 출처: ASTM B88 Table 1 Type M — 1-1/4", OD 34.93mm, t 1.07mm
  { nominalA: 32,  od_mm: 34.93, t_mm: 1.07, id_mm: 34.93 - 2 * 1.07 },
  // 출처: ASTM B88 Table 1 Type M — 1-1/2", OD 41.28mm, t 1.24mm
  { nominalA: 40,  od_mm: 41.28, t_mm: 1.24, id_mm: 41.28 - 2 * 1.24 },
  // 출처: ASTM B88 Table 1 Type M — 2", OD 53.98mm, t 1.47mm
  { nominalA: 50,  od_mm: 53.98, t_mm: 1.47, id_mm: 53.98 - 2 * 1.47 },
  // 출처: ASTM B88 Table 1 Type M — 2-1/2", OD 66.68mm, t 1.65mm
  { nominalA: 65,  od_mm: 66.68, t_mm: 1.65, id_mm: 66.68 - 2 * 1.65 },
  // 출처: ASTM B88 Table 1 Type M — 3", OD 79.38mm, t 1.83mm
  { nominalA: 80,  od_mm: 79.38, t_mm: 1.83, id_mm: 79.38 - 2 * 1.83 },
  // 출처: ASTM B88 Table 1 Type M — 4", OD 104.78mm, t 2.41mm
  { nominalA: 100, od_mm: 104.78, t_mm: 2.41, id_mm: 104.78 - 2 * 2.41 },
  // 출처: ASTM B88 Table 1 Type M — 5", OD 130.18mm, t 2.77mm
  { nominalA: 125, od_mm: 130.18, t_mm: 2.77, id_mm: 130.18 - 2 * 2.77 },
  // 출처: ASTM B88 Table 1 Type M — 6", OD 155.58mm, t 2.77mm
  { nominalA: 150, od_mm: 155.58, t_mm: 2.77, id_mm: 155.58 - 2 * 2.77 },
  // 출처: ASTM B88 Table 1 Type M — 8", OD 206.38mm, t 3.81mm
  { nominalA: 200, od_mm: 206.38, t_mm: 3.81, id_mm: 206.38 - 2 * 3.81 },
];

// ── PVC / C-PVC Sch40 (ASTM D1785) ────────────────────────────────
// 출처: ASTM D1785-15 (Poly(Vinyl Chloride) (PVC) Plastic Pipe, Schedules 40, 80 and 120), Table 1 Sch40
// https://www.astm.org/d1785-15.html
const PVC_SCH40: PipeSize[] = [
  // 출처: ASTM D1785 Table 1 Sch40 — 1/2", OD 21.34mm, t 2.77mm
  { nominalA: 15,  od_mm: 21.34, t_mm: 2.77, id_mm: 21.34 - 2 * 2.77 },
  // 출처: ASTM D1785 Table 1 Sch40 — 3/4", OD 26.67mm, t 2.87mm
  { nominalA: 20,  od_mm: 26.67, t_mm: 2.87, id_mm: 26.67 - 2 * 2.87 },
  // 출처: ASTM D1785 Table 1 Sch40 — 1", OD 33.40mm, t 3.38mm
  { nominalA: 25,  od_mm: 33.40, t_mm: 3.38, id_mm: 33.40 - 2 * 3.38 },
  // 출처: ASTM D1785 Table 1 Sch40 — 1-1/4", OD 42.16mm, t 3.56mm
  { nominalA: 32,  od_mm: 42.16, t_mm: 3.56, id_mm: 42.16 - 2 * 3.56 },
  // 출처: ASTM D1785 Table 1 Sch40 — 1-1/2", OD 48.26mm, t 3.68mm
  { nominalA: 40,  od_mm: 48.26, t_mm: 3.68, id_mm: 48.26 - 2 * 3.68 },
  // 출처: ASTM D1785 Table 1 Sch40 — 2", OD 60.33mm, t 3.91mm
  { nominalA: 50,  od_mm: 60.33, t_mm: 3.91, id_mm: 60.33 - 2 * 3.91 },
  // 출처: ASTM D1785 Table 1 Sch40 — 2-1/2", OD 73.03mm, t 5.16mm
  { nominalA: 65,  od_mm: 73.03, t_mm: 5.16, id_mm: 73.03 - 2 * 5.16 },
  // 출처: ASTM D1785 Table 1 Sch40 — 3", OD 88.90mm, t 5.49mm
  { nominalA: 80,  od_mm: 88.90, t_mm: 5.49, id_mm: 88.90 - 2 * 5.49 },
  // 출처: ASTM D1785 Table 1 Sch40 — 4", OD 114.30mm, t 6.02mm
  { nominalA: 100, od_mm: 114.30, t_mm: 6.02, id_mm: 114.30 - 2 * 6.02 },
];

// ── PVC / C-PVC Sch80 (ASTM D1785 / ASTM F441) ────────────────────
// 출처: ASTM D1785-15 Table 1 Sch80 (PVC) / ASTM F441-13 (C-PVC Schedule 80)
// https://www.astm.org/d1785-15.html / https://www.astm.org/f0441-13.html
// 엑셀 원본 데이터와 동일
const PVC_SCH80: PipeSize[] = [
  // 출처: ASTM D1785 Table 1 Sch80 — 1/2", OD 21.34mm, t 3.73mm
  { nominalA: 15,  od_mm: 21.34, t_mm: 3.73, id_mm: 21.34 - 2 * 3.73 },
  // 출처: ASTM D1785 Table 1 Sch80 — 3/4", OD 26.67mm, t 3.91mm
  { nominalA: 20,  od_mm: 26.67, t_mm: 3.91, id_mm: 26.67 - 2 * 3.91 },
  // 출처: ASTM D1785 Table 1 Sch80 — 1", OD 33.40mm, t 4.55mm
  { nominalA: 25,  od_mm: 33.40, t_mm: 4.55, id_mm: 33.40 - 2 * 4.55 },
  // 출처: ASTM D1785 Table 1 Sch80 — 1-1/4", OD 42.16mm, t 4.85mm
  { nominalA: 32,  od_mm: 42.16, t_mm: 4.85, id_mm: 42.16 - 2 * 4.85 },
  // 출처: ASTM D1785 Table 1 Sch80 — 1-1/2", OD 48.26mm, t 5.08mm
  { nominalA: 40,  od_mm: 48.26, t_mm: 5.08, id_mm: 48.26 - 2 * 5.08 },
  // 출처: ASTM D1785 Table 1 Sch80 — 2", OD 60.33mm, t 5.54mm
  { nominalA: 50,  od_mm: 60.33, t_mm: 5.54, id_mm: 60.33 - 2 * 5.54 },
  // 출처: ASTM D1785 Table 1 Sch80 — 2-1/2", OD 73.03mm, t 7.01mm
  { nominalA: 65,  od_mm: 73.03, t_mm: 7.01, id_mm: 73.03 - 2 * 7.01 },
  // 출처: ASTM D1785 Table 1 Sch80 — 3", OD 88.90mm, t 7.62mm
  { nominalA: 80,  od_mm: 88.90, t_mm: 7.62, id_mm: 88.90 - 2 * 7.62 },
  // 출처: ASTM D1785 Table 1 Sch80 — 4", OD 114.30mm, t 8.56mm
  { nominalA: 100, od_mm: 114.30, t_mm: 8.56, id_mm: 114.30 - 2 * 8.56 },
];

// ── V2 PIPE_MATERIALS_V2 ─────────────────────────────────────────────
// 마찰계수: 고정 f 폐기 — 유동 영역별 자동 산출(pipe-friction/engine.ts) + ε(pipeRoughness.ts)로 대체.

export const PIPE_MATERIALS_V2: MaterialSpec[] = [
  {
    id: 'sgp',
    label: '탄소강관',
    schedules: [
      { id: 'ks-std',  label: 'KS일반',  sizes: SGP_KS_STD },
      { id: 'sch40',   label: 'Sch40',   sizes: SGP_SCH40 },
      { id: 'sch80',   label: 'Sch80',   sizes: SGP_SCH80 },
    ],
  },
  {
    id: 'stainless',
    label: '스테인리스강관',
    schedules: [
      { id: 'ss-5s',  label: '5S',   sizes: STS_5S },
      { id: 'ss-10s', label: '10S',  sizes: STS_10S },
      { id: 'ss-40s', label: '40S',  sizes: STS_40S },
    ],
  },
  {
    id: 'copper',
    label: '동관',
    schedules: [
      { id: 'cu-k', label: 'Type K', sizes: COPPER_TYPE_K },
      { id: 'cu-l', label: 'Type L', sizes: COPPER_TYPE_L },
      { id: 'cu-m', label: 'Type M', sizes: COPPER_TYPE_M },
    ],
  },
  {
    id: 'pvc',
    label: 'PVC/C-PVC',
    schedules: [
      { id: 'pvc-sch40', label: 'Sch40', sizes: PVC_SCH40 },
      { id: 'pvc-sch80', label: 'Sch80', sizes: PVC_SCH80 },
    ],
  },
];

// ── 하위 호환: 기존 타입 및 export 유지 ─────────────────────────────
// pipe-friction/pipe-sizing 계산기는 이 export를 그대로 사용 (변경 금지)

export interface PipeSpec {
  nominalA: number;    // 호칭 (A)
  od_mm: number;       // 외경
  id_mm: number;       // 내경 (계산에 사용)
  wall_mm?: number;    // 두께 (참고용)
}

export interface PipeMaterialSize {
  id: 'sgp' | 'sts10s' | 'pvc-cpvc' | 'copper';
  nameKo: string;
  nameEn: string;
  abbreviation: string | null;
  description: string;
  sizes: PipeSpec[];
}

// 하위 호환 export — 각 재질의 기본 schedule (sgp=KS일반, sts10s=10S, copper=Type L, pvc=Sch80)
// PipeSpec 형태로 평탄화 (wall_mm = t_mm)
function v2ToLegacySizes(sizes: PipeSize[]): PipeSpec[] {
  return sizes.map(s => ({ nominalA: s.nominalA, od_mm: s.od_mm, id_mm: s.id_mm, wall_mm: s.t_mm }));
}

// ── pump-hvac helper ────────────────────────────────────────────────
// V2 id 또는 legacy id (sts10s, pvc-cpvc)로 한글명 조회 — legacy id는 history 호환 alias
export function getMaterialLabel(materialId: string): string {
  const v2 = PIPE_MATERIALS_V2.find(m => m.id === materialId);
  if (v2) return v2.label;
  if (materialId === 'sts10s')   return PIPE_MATERIALS_V2.find(m => m.id === 'stainless')!.label;
  if (materialId === 'pvc-cpvc') return PIPE_MATERIALS_V2.find(m => m.id === 'pvc')!.label;
  return materialId;
}

export const PIPE_SIZE_MATERIALS: PipeMaterialSize[] = [
  {
    id: 'sgp',
    nameKo: '탄소강관',
    nameEn: 'Carbon Steel Pipe',
    abbreviation: 'SPPS, SPP',
    description: '일반 배관용 탄소강관 (KS일반)',
    sizes: v2ToLegacySizes(SGP_KS_STD),
  },
  {
    id: 'sts10s',
    nameKo: '스테인리스강관',
    nameEn: 'Stainless Steel 10S',
    abbreviation: 'STS 304, 316',
    description: '스테인리스강관 (STS304 10S 계열)',
    sizes: v2ToLegacySizes(STS_10S),
  },
  {
    id: 'pvc-cpvc',
    nameKo: 'PVC / C-PVC',
    nameEn: 'PVC / C-PVC',
    abbreviation: null,
    description: 'PVC · C-PVC 압력 배관 (Sch80)',
    sizes: v2ToLegacySizes(PVC_SCH80),
  },
  {
    id: 'copper',
    nameKo: '동관',
    nameEn: 'Copper',
    abbreviation: 'Copper',
    description: '동관 (인동·탈산동) Type L',
    sizes: v2ToLegacySizes(COPPER_TYPE_L),
  },
];
