import * as deepl from "deepl-node";

const translator = new deepl.Translator(process.env.DEEPL_API_KEY || "");

export async function textTranslate(
  text: string,
  sourceLang: deepl.SourceLanguageCode,
  targetLang: deepl.TargetLanguageCode
) {
  const translated = await translator.translateText(
    text,
    sourceLang,
    targetLang,
    {
      tagHandling: "html",
    }
  );

  return contentFilter(
    await blockTranslate(translated.text, sourceLang, targetLang)
  );
}

export async function blockTranslate(
  text: string,
  sourceLang: deepl.SourceLanguageCode,
  targetLang: deepl.TargetLanguageCode
) {
  const jsons = text.match(/(?<=<!-- wp:.*?){.*?}(?= \/?-->$)/gm);

  if (jsons) {
    const translatedJsons = await Promise.all(
      jsons.map(async (json) => {
        const obj = JSON.parse(json);
        const translatedObj = await objTranslate(obj, sourceLang, targetLang);
        return JSON.stringify(translatedObj);
      })
    );

    for (let i = 0; i < jsons.length; i++) {
      text = text.replace(jsons[i], translatedJsons[i]);
    }
  }

  return text;
}

export async function objTranslate(
  obj: { [key: string]: any },
  sourceLang: deepl.SourceLanguageCode,
  targetLang: deepl.TargetLanguageCode
) {
  const translatedObj: any = {};

  for (const key in obj) {
    const val = obj[key];

    console.log(val);

    if (typeof obj[key] === "string") {
      translatedObj[key] = await textTranslate(val, sourceLang, targetLang);
    } else if (typeof obj[key] === "object") {
      translatedObj[key] = await objTranslate(val, sourceLang, targetLang);
    } else {
      translatedObj[key] = obj[key];
    }
  }

  return translatedObj;
}

export function contentFilter(text: string): string {
  // Add a newline before and after the embed YouTube URL
  text = text.replace(
    /(?<="wp-block-embed__wrapper">\s*)(https?:\/\/www\.youtube\.com\/watch.*?)(?=<\/div>)/,
    "\n$1\n"
  );

  return text;
}
