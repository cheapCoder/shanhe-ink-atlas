import { t } from '@/locale';
import type { MediaInfo } from '@/types';

// 配图署名：作者、许可与 Wikimedia Commons 文件页
export default function ImageCredit({ media }: { media?: MediaInfo }) {
  if (!media) return null;
  return (
    <figcaption>
      {t('panel_image')}: {media.credit || t('panel_anonymous')} · {media.license}
      {media.filePage && (
        <>
          {' · '}
          <a href={media.filePage} target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
        </>
      )}
    </figcaption>
  );
}
