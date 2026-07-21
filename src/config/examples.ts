// 계산기별 예시 프리셋 — 워크스페이스 헤더 "예시" 드롭다운에서 불러오기
// 수치는 실무·교과서에서 통용되는 일반적인 값 (특정 프로젝트·카탈로그와 무관):
//  · 배관 설계유속 1~3 m/s (대표값 2 m/s), 덕트 저속 5 m/s 내외
//  · 허용 마찰손실 R = 30 mmAq/m (배관), 1 Pa/m (덕트)
//  · 냉수 공급 7°C, 냉각수 32°C, 온수 60°C, 실내 냉방 설계조건 26°C·RH 60%
// state는 각 계산기의 initialState(기록 저장 포맷)와 동일한 스키마.

export interface ExamplePreset {
  label: string;
  description: string;
  state: Record<string, unknown>;
}

export const EXAMPLE_PRESETS: Record<string, ExamplePreset[]> = {
  'pipe-friction': [
    {
      label: '급수 배관 (물 · DN100 · 2 m/s)',
      description: '물 20°C · 탄소강관(신관) · V=2 m/s · D=100 mm · L=100 m — 설계유속 1~3 m/s의 대표값',
      state: {
        fluid: 'water', tempC: '20', materialId: 'steel', condition: 'new',
        V: '2', D: '100', inputOrder: ['V', 'D'], L: '100',
        flowUnit: 'm3h', pressureUnit: 'kPa',
      },
    },
    {
      label: '층류 확인 (소구경 · 저유속)',
      description: '물 20°C · 강관(신관) · V=0.1 m/s · D=20 mm · L=10 m — Re<2,300 층류, f=64/Re 적용 확인',
      state: {
        fluid: 'water', tempC: '20', materialId: 'steel', condition: 'new',
        V: '0.1', D: '20', inputOrder: ['V', 'D'], L: '10',
        flowUnit: 'm3h', pressureUnit: 'kPa',
      },
    },
    {
      label: '공기 덕트 (원형 · 5 m/s)',
      description: '공기 20°C·760 mmHg · V=5 m/s · D=300 mm · L=50 m — 저속덕트 대표 유속',
      state: {
        fluid: 'air', tempC: '20', pressureMmHg: '760', materialId: 'steel', condition: 'new',
        V: '5', D: '300', inputOrder: ['V', 'D'], L: '50',
        flowUnit: 'm3h', pressureUnit: 'kPa',
      },
    },
  ],

  'pipe-sizing': [
    {
      label: '소형 급수 (100 LPM)',
      description: '물 20°C · 탄소강관(신관) · Q=100 LPM · 허용 R=30 mmAq/m — 실무 표준 마찰손실 기준',
      state: {
        matIdx: 0, Q: '100', dP: '30', fluid: 'water', tempC: '20', pressureMmHg: '760',
        condition: 'new', flowUnit: 'lpm', pressureUnit: 'mmAq',
      },
    },
    {
      label: '중형 냉수 배관 (500 LPM)',
      description: '물 20°C · 스테인리스강관(신관) · Q=500 LPM · 허용 R=30 mmAq/m',
      state: {
        matIdx: 1, Q: '500', dP: '30', fluid: 'water', tempC: '20', pressureMmHg: '760',
        condition: 'new', flowUnit: 'lpm', pressureUnit: 'mmAq',
      },
    },
    {
      label: '대형 공조 배관 (2,000 LPM)',
      description: '물 20°C · 탄소강관(신관) · Q=2,000 LPM · 허용 R=30 mmAq/m',
      state: {
        matIdx: 0, Q: '2000', dP: '30', fluid: 'water', tempC: '20', pressureMmHg: '760',
        condition: 'new', flowUnit: 'lpm', pressureUnit: 'mmAq',
      },
    },
  ],

  'insulation-thickness': [
    {
      label: '일반 실내 냉수배관 (50A)',
      description: '냉수 7°C · 실내 26°C·RH 60% (여름철 실내 설계조건) · 고무발포',
      state: {
        pipeIdx: 5, matIdx: 0, customK: '',
        Ti: '7', Ta: '26', RH: '60', ho: '9.3', safetyFactor: '1.2',
      },
    },
    {
      label: '고온다습 환경 (50A)',
      description: '냉수 7°C · 30°C·RH 85% (장마철 비공조 구역) · 고무발포 — 두께 증가 케이스',
      state: {
        pipeIdx: 5, matIdx: 0, customK: '',
        Ti: '7', Ta: '30', RH: '85', ho: '9.3', safetyFactor: '1.2',
      },
    },
    {
      label: '기계실 대형관 (100A)',
      description: '냉수 6°C · 기계실 32°C·RH 80% · 고무발포',
      state: {
        pipeIdx: 8, matIdx: 0, customK: '',
        Ti: '6', Ta: '32', RH: '80', ho: '9.3', safetyFactor: '1.2',
      },
    },
  ],

  'pump-hvac': [
    {
      label: '냉수 순환 펌프 (폐회로)',
      description: '냉수 7°C · Q=60 m³/h · DN100 흡입 5 m / 토출 60 m · 증발기 50 kPa·코일 30 kPa·컨트롤밸브 30 kPa',
      state: {
        systemMode: 'closed', fluid: 'water', tempC: '7', Q: '60', flowUnit: 'm3h',
        pipeCondition: 'new',
        sucPipeRows: [{ uid: 'ex-chw-suc-1', materialId: 'sgp', scheduleId: 'ks-std', nominalA: 100, lStr: '5', lUnit: 'm' }],
        disPipeRows: [{ uid: 'ex-chw-dis-1', materialId: 'sgp', scheduleId: 'ks-std', nominalA: 100, lStr: '60', lUnit: 'm' }],
        fittingRows: [
          { uid: 'ex-chw-fit-1', fittingId: 'elbow-90-standard', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 2 },
          { uid: 'ex-chw-fit-2', fittingId: 'gate-valve-open', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 1 },
          { uid: 'ex-chw-fit-3', fittingId: 'elbow-90-standard', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 6 },
          { uid: 'ex-chw-fit-4', fittingId: 'gate-valve-open', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 2 },
          { uid: 'ex-chw-fit-5', fittingId: 'swing-check-valve', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
        ],
        equipRows: [
          { uid: 'ex-chw-eq-1', name: '냉동기 증발기', dP: '50', dPUnit: 'kPa', pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger', dirtyMargin: false },
          { uid: 'ex-chw-eq-2', name: '공조기 냉수코일', dP: '30', dPUnit: 'kPa', pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger', dirtyMargin: false },
          { uid: 'ex-chw-eq-3', name: '컨트롤 밸브', dP: '30', dPUnit: 'kPa', pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'control-valve', dirtyMargin: false },
        ],
        HsStr: '0', HdStr: '0', PresStr: '0', presUnit: 'kPa', PatmStr: '101.325',
      },
    },
    {
      label: '냉각수 펌프 (개방계)',
      description: '냉각수 32°C · Q=120 m³/h · DN150 흡입 8 m / 토출 80 m · 응축기 60 kPa · Hs=2 m·Hd=15 m·잔류압 30 kPa',
      state: {
        systemMode: 'open', fluid: 'cooling-water', tempC: '32', Q: '120', flowUnit: 'm3h',
        pipeCondition: 'new',
        sucPipeRows: [{ uid: 'ex-cw-suc-1', materialId: 'sgp', scheduleId: 'ks-std', nominalA: 150, lStr: '8', lUnit: 'm' }],
        disPipeRows: [{ uid: 'ex-cw-dis-1', materialId: 'sgp', scheduleId: 'ks-std', nominalA: 150, lStr: '80', lUnit: 'm' }],
        fittingRows: [
          { uid: 'ex-cw-fit-1', fittingId: 'elbow-90-standard', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 2 },
          { uid: 'ex-cw-fit-2', fittingId: 'gate-valve-open', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 1 },
          { uid: 'ex-cw-fit-3', fittingId: 'elbow-90-standard', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 6 },
          { uid: 'ex-cw-fit-4', fittingId: 'gate-valve-open', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 2 },
          { uid: 'ex-cw-fit-5', fittingId: 'swing-check-valve', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
        ],
        equipRows: [
          { uid: 'ex-cw-eq-1', name: '냉동기 응축기', dP: '60', dPUnit: 'kPa', pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger', dirtyMargin: false },
          { uid: 'ex-cw-eq-2', name: '컨트롤 밸브', dP: '30', dPUnit: 'kPa', pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'control-valve', dirtyMargin: false },
        ],
        HsStr: '2', HdStr: '15', PresStr: '30', presUnit: 'kPa', PatmStr: '101.325',
      },
    },
    {
      label: '난방 온수 순환 펌프 (폐회로)',
      description: '온수 60°C · Q=30 m³/h · DN80 흡입 5 m / 토출 40 m · 보일러 30 kPa·방열코일 25 kPa·컨트롤밸브 20 kPa',
      state: {
        systemMode: 'closed', fluid: 'hot-water', tempC: '60', Q: '30', flowUnit: 'm3h',
        pipeCondition: 'new',
        sucPipeRows: [{ uid: 'ex-hw-suc-1', materialId: 'sgp', scheduleId: 'ks-std', nominalA: 80, lStr: '5', lUnit: 'm' }],
        disPipeRows: [{ uid: 'ex-hw-dis-1', materialId: 'sgp', scheduleId: 'ks-std', nominalA: 80, lStr: '40', lUnit: 'm' }],
        fittingRows: [
          { uid: 'ex-hw-fit-1', fittingId: 'elbow-90-standard', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 2 },
          { uid: 'ex-hw-fit-2', fittingId: 'gate-valve-open', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 1 },
          { uid: 'ex-hw-fit-3', fittingId: 'elbow-90-standard', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 4 },
          { uid: 'ex-hw-fit-4', fittingId: 'gate-valve-open', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 2 },
          { uid: 'ex-hw-fit-5', fittingId: 'swing-check-valve', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
        ],
        equipRows: [
          { uid: 'ex-hw-eq-1', name: '보일러', dP: '30', dPUnit: 'kPa', pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger', dirtyMargin: false },
          { uid: 'ex-hw-eq-2', name: '방열 코일', dP: '25', dPUnit: 'kPa', pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger', dirtyMargin: false },
          { uid: 'ex-hw-eq-3', name: '컨트롤 밸브', dP: '20', dPUnit: 'kPa', pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'control-valve', dirtyMargin: false },
        ],
        HsStr: '0', HdStr: '0', PresStr: '0', presUnit: 'kPa', PatmStr: '101.325',
      },
    },
  ],

  'friction-network': [
    {
      label: '배관 1분기 계통 (물 · LPM)',
      description: '물 20°C · 강관(신관) · 메인 DN50(내경 52.9 mm) + 분기 2개 (말단 150 LPM·요구압 15 kPa) · 가용정압 70 kPa',
      state: {
        settings: {
          systemType: 'pipe', fluid: 'water', tempC: '20',
          pAvail: '70000', alphaPct: '10', flowUnit: 'LPM',
        },
        segments: [
          { id: 'S01', parentId: 'ROOT', grade: 'main', shape: 'circle', D: '52.9', a: '', b: '', L: '20', sumK: '5', equip: '0', materialId: 'steel', condition: 'new', terminalFlow: '', pReq: '0', fittings: [] },
          { id: 'S02', parentId: 'S01', grade: 'branch', shape: 'circle', D: '52.9', a: '', b: '', L: '10', sumK: '3', equip: '0', materialId: 'steel', condition: 'new', terminalFlow: '150', pReq: '15000', fittings: [] },
          { id: 'S03', parentId: 'S01', grade: 'branch', shape: 'circle', D: '52.9', a: '', b: '', L: '12', sumK: '3', equip: '0', materialId: 'steel', condition: 'new', terminalFlow: '150', pReq: '15000', fittings: [] },
        ],
      },
    },
    {
      label: '덕트 계통 (사각 메인 + 원형 분기)',
      description: '공기 20°C · 아연도금강판 · 사각 400×200 메인 + 원형 250 분기 2개 (말단 900 CMH·취출구 50 Pa) · 가용정압 500 Pa',
      state: {
        settings: {
          systemType: 'duct', fluid: 'air', tempC: '20',
          pAvail: '500', alphaPct: '10', flowUnit: 'CMH',
          targetR: '1', targetRUnit: 'Pa/m',
          vLimits: {
            main: { min: '6', max: '10' },
            sub: { min: '4', max: '8' },
            branch: { min: '5', max: '7' },
          },
        },
        segments: [
          { id: 'D01', parentId: 'ROOT', grade: 'main', shape: 'rect', D: '', a: '400', b: '200', L: '15', sumK: '1.5', equip: '0', materialId: 'galv-sheet', condition: 'new', terminalFlow: '', pReq: '0', fittings: [] },
          { id: 'D02', parentId: 'D01', grade: 'branch', shape: 'circle', D: '250', a: '', b: '', L: '8', sumK: '2', equip: '0', materialId: 'galv-sheet', condition: 'new', terminalFlow: '900', pReq: '50', fittings: [] },
          { id: 'D03', parentId: 'D01', grade: 'branch', shape: 'circle', D: '250', a: '', b: '', L: '10', sumK: '2', equip: '0', materialId: 'galv-sheet', condition: 'new', terminalFlow: '900', pReq: '50', fittings: [] },
        ],
      },
    },
  ],
};
