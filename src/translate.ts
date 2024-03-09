import * as deepl from "deepl-node";

const deeplTranslate = new deepl.Translator(process.env.DEEPL_API_KEY || "");

export class Translator {
  private sourceLang: deepl.SourceLanguageCode;
  private targetLang: deepl.TargetLanguageCode;
  private inputObj: { [key: string]: any };
  private translateMap: Map<string, string> = new Map();

  constructor(
    sourceLang: deepl.SourceLanguageCode,
    targetLang: deepl.TargetLanguageCode,
    obj: { [key: string]: any }
  ) {
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.inputObj = obj;
  }

  public async translate(): Promise<{ [key: string]: any }> {
    return await this.objTranslate(this.inputObj, 0);
  }

  private async objTranslate(
    obj: { [key: string]: any },
    depth: number
  ): Promise<any> {
    const newObj: any = {};

    for (const key in obj) {
      const val = obj[key];

      if (typeof obj[key] === "string") {
        newObj[key] = await this.textTranslate(val, depth);
      } else if (typeof obj[key] === "object") {
        newObj[key] = await this.objTranslate(val, depth + 1);
      } else {
        newObj[key] = obj[key];
      }
    }

    return newObj;
  }

  private async textTranslate(text: string, depth: number): Promise<string> {
    console.log("depth: ", depth);

    console.log(text);

    const translated = await deeplTranslate.translateText(
      text,
      this.sourceLang,
      this.targetLang,
      {
        tagHandling: "html",
      }
    );

    return this.contentFilter(
      await this.blockTranslate(translated.text, depth)
    );
  }

  private async blockTranslate(text: string, depth: number): Promise<string> {
    const jsons = text.match(/(?<=<!-- wp:.*?){.*?}(?= \/?-->$)/gm);

    if (jsons) {
      const translatedJsons = await Promise.all(
        jsons.map(async (json) => {
          const obj = JSON.parse(json);
          const translatedObj = await this.objTranslate(obj, depth + 1);
          return JSON.stringify(translatedObj);
        })
      );

      for (let i = 0; i < jsons.length; i++) {
        text = text.replace(jsons[i], translatedJsons[i]);
      }
    }

    return text;
  }

  private contentFilter(text: string): string {
    // Add a newline before and after the embed URL
    text = text.replace(
      /(?<=<div class="wp-block-embed__wrapper">\s*)(https?:\/\/.*?)(?=<\/div>)/g,
      "\n$1\n"
    );

    return text;
  }
}
