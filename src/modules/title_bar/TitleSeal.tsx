import { t } from '@/locale';
import './titleBar.css';

// 左上角题签：竖排书名 + 朱文印，仿画心题款
export default function TitleSeal() {
  return (
    <header className="title-seal">
      <h1 className="title-seal__name">{t('app_title')}</h1>
      <span className="title-seal__stamp seal">{t('app_seal')}</span>
      <p className="title-seal__sub">{t('app_subtitle')}</p>
    </header>
  );
}
