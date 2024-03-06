import * as deepl from "deepl-node";

const translator = new deepl.Translator(process.env.DEEPL_API_KEY || "");

type TranslationContents = {
  title: string;
  content: string;
};

export async function translate(
  contents: string[],
  sourceLang: deepl.SourceLanguageCode,
  targetLang: deepl.TargetLanguageCode,
) {
  const translated = await translator.translateText(
    contents,
    sourceLang,
    targetLang,
    {
      tagHandling: "html",
    }
  );

  return translated.map((t) => t.text);
}
