import { tr, useLanguage, setLanguage } from './i18n.js';
export default function LanguageSelect({ compact=false }) {
 const language=useLanguage();
 return <label className={compact?'language-select landing-language':'settings-field language-select'}><span>{language==='en'?'Language':'Ngôn ngữ'}</span><select aria-label="Language / Ngôn ngữ" value={language} onChange={e=>setLanguage(e.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>;
}
