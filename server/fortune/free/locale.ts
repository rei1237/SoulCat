// The imported reference calculator is used on the Korean SoulCat surface.
export type LoadingLocale = 'ko'|'en'|'ja'|'zh'|'zh-TW'|'zh-CN';
export const getCurrentLoadingLocale = (): LoadingLocale => 'ko';
export const normalizeLoadingLocale = (_value?: unknown): LoadingLocale => 'ko';
