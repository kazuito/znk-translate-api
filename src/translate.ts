import * as deepl from "deepl-node";
import { v4 as uuidv4 } from "uuid";
import { includesJapanese } from "./utils";
import { config } from "dotenv";
import path from "path";

config({
  path: path.join(__dirname, "../.env"),
});

export class Translator {
  private sourceLang: deepl.SourceLanguageCode;
  private targetLang: deepl.TargetLanguageCode;
  private inputObj: { [key: string]: any };
  private translateMap: Map<string, string> = new Map();
  private translator: deepl.Translator;

  constructor(
    deeplApiKey: string,
    sourceLang: deepl.SourceLanguageCode,
    targetLang: deepl.TargetLanguageCode,
    obj: { [key: string]: any }
  ) {
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.inputObj = obj;

    this.translator = new deepl.Translator(deeplApiKey);
  }

  public translate() {
    return new Promise(async (resolve, reject) => {
      const result = await this.resolveHash(
        JSON.stringify(await this.objTranslate(this.inputObj, 0))
      );
      resolve(JSON.parse(result));
    });
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
    const translated = await (async () => {
      if (depth > 0) {
        if (!includesJapanese(text)) return text;

        const hash = uuidv4();
        this.translateMap.set(hash, text);
        return hash;
      }

      return this.translator
        .translateText(text, this.sourceLang, this.targetLang, {
          tagHandling: "html",
        })
        .then((res) => res.text);
    })();

    return this.contentFilter(await this.blockTranslate(translated, depth));
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

  private async resolveHash(text: string) {
    if (this.translateMap.size === 0) return text;

    const values = Array.from(this.translateMap.values());

    const translatedValues = await this.translator.translateText(
      values,
      this.sourceLang,
      this.targetLang
    );

    let i = 0;

    this.translateMap.forEach((_, key) => {
      text = text.replace(
        key,
        translatedValues[i]?.text.replace(/"/g, "\u201D") ?? ""
      );
      i++;
    });

    return text;
  }
  public async checkAvailability() {
    const usage = await this.translator.getUsage();

    if (usage.anyLimitReached()) {
      throw new Error("DeepL limit reached");
    }

    return true;
  }
}
