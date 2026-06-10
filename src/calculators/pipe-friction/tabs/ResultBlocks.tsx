// 관마찰손실 — 메인 열 결과 블록: 마찰저항선도(Moody) + 경고

import WarningList from '../../../components/WarningList';
import { pfWarnings } from '../interpret.ts';
import MoodyChart from './MoodyChart';
import type { PipeFrictionController } from '../usePipeFrictionState.ts';

export default function ResultBlocks({ pf }: { pf: PipeFrictionController }) {
  const { res, st } = pf;
  if (!res) return null;

  return (
    <>
      <MoodyChart res={res} />
      <WarningList items={pfWarnings(res, st.fluid === 'water')} />
    </>
  );
}
