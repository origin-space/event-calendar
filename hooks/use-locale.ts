import { Locale, ptBR, enUS } from "date-fns/locale"
import { useTranslation } from "react-i18next";

const localeMap : Record<string, Locale> = {
  "en": enUS,
  "en-US": enUS,
  "pt": ptBR,
  "pt-BR": ptBR
};

export function useLocale() {
  const { i18n } = useTranslation()
  return localeMap[i18n.language];
}