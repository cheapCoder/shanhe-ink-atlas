import { useEffect, useRef, useState } from 'react';
import { t, tx } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { LINEAGES, LINEAGE_BY_ID } from '@/data/lineages';
import { CHRONOLOGIES, periodAt } from '@/data/chronology';
import { useChrono } from '@/modules/time_line/useChrono';

// 纪年所依的国家：显示“国名 · 当前时期”。疆域、人物模式下随所看的对象自动切换，
// 其余模式点开可自选一国，时间轴上的年表随之更换
export default function ChronoPicker({ year }: { year: number }) {
  const { id, auto } = useChrono();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const lineage = LINEAGE_BY_ID.get(id);
  const period = periodAt(id, year);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  if (!lineage) return null;
  const label = (
    <>
      {tx(lineage.name)}
      {period && <> · {tx(period.name)}</>}
    </>
  );
  if (auto) {
    return (
      <span className="chrono" title={t('chrono_auto')}>
        {label}
      </span>
    );
  }
  return (
    <span className="chrono" ref={box}>
      <button className="chrono__button" aria-haspopup="listbox" aria-expanded={open} title={t('chrono_pick')} onClick={() => setOpen(!open)}>
        {label}
        <i aria-hidden="true">▾</i>
      </button>
      {open && (
        <ul className="chrono__menu" role="listbox" aria-label={t('chrono_pick')}>
          {LINEAGES.filter((l) => CHRONOLOGIES[l.id]).map((l) => (
            <li key={l.id} role="option" aria-selected={l.id === id}>
              <button
                className={l.id === id ? 'is-active' : ''}
                onClick={() => {
                  useAtlas.getState().setChronoId(l.id);
                  setOpen(false);
                }}
              >
                <i style={{ background: l.color }} />
                {tx(l.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
