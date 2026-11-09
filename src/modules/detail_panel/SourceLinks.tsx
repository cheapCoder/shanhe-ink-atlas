import type { MediaInfo } from '@/types';

// 参考资料：中英文维基百科条目与 Wikidata 条目（均由抓取脚本核验存在）
export default function SourceLinks({ media }: { media?: MediaInfo }) {
  if (!media) return null;
  return (
    <p className="panel-links">
      {media.zhUrl && (
        <a href={media.zhUrl} target="_blank" rel="noreferrer">
          维基百科（中文）
        </a>
      )}
      {media.enUrl && (
        <a href={media.enUrl} target="_blank" rel="noreferrer">
          Wikipedia（英文）
        </a>
      )}
      {media.wikidata && (
        <a href={`https://www.wikidata.org/wiki/${media.wikidata}`} target="_blank" rel="noreferrer">
          Wikidata {media.wikidata}
        </a>
      )}
    </p>
  );
}
