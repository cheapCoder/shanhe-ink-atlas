import { t } from '@/locale';
import type { MediaInfo, WikiRef } from '@/types';
import { wikiLinks } from '@/data/media';

// 参考资料：中英文维基百科条目与 Wikidata 条目
export default function SourceLinks({ wiki, media }: { wiki?: WikiRef; media?: MediaInfo }) {
  const links = wikiLinks(wiki, media);
  if (!links.zh && !links.en) return null;
  return (
    <p className="panel-links">
      {links.zh && (
        <a href={links.zh} target="_blank" rel="noreferrer">
          {t('panel_wiki_zh')}
        </a>
      )}
      {links.en && (
        <a href={links.en} target="_blank" rel="noreferrer">
          {t('panel_wiki_en')}
        </a>
      )}
      {links.wikidata && (
        <a href={`https://www.wikidata.org/wiki/${links.wikidata}`} target="_blank" rel="noreferrer">
          Wikidata {links.wikidata}
        </a>
      )}
    </p>
  );
}
