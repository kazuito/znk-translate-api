export function includesJapanese(text: string): boolean {
  return (
    text.match(
      /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/
    ) !== null
  );
}

const availableTargetLangs = [
  "bg",
  "cs",
  "da",
  "de",
  "el",
  "es",
  "et",
  "fi",
  "fr",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lt",
  "lv",
  "nb",
  "nl",
  "pl",
  "ro",
  "ru",
  "sk",
  "sl",
  "sv",
  "tr",
  "uk",
  "zh",
  "en-GB",
  "en-US",
  "pt-BR",
  "pt-PT",
];

export function isAvailableTargetLang(lang: string): boolean {
  return availableTargetLangs.includes(lang);
}
