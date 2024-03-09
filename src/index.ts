import express from "express";
import * as deepl from "deepl-node";
import bodyParser from "body-parser";
import { Translator } from "./translate";

const app = express();

type Input = {
  contents: { [key: string]: string };
  sourceLang: deepl.SourceLanguageCode;
  targetLang: deepl.TargetLanguageCode | deepl.TargetLanguageCode[];
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/translate", async (req, res) => {
  console.log("## Translation Request ##", new Date().toLocaleString());

  const input: Input = req.body;
  const targetLangs = Array.isArray(input.targetLang)
    ? input.targetLang
    : [input.targetLang];

  const formattedTargetLangs = formatLangs(targetLangs);

  console.log("Translating...");

  const resultBlocks = await Promise.all(
    formattedTargetLangs.map(async (targetLang) => {
      const translator = new Translator(
        input.sourceLang,
        targetLang,
        input.contents
      );

      const newContents = await translator.translate();

      return {
        contents: newContents,
        lang: targetLang,
      };
    })
  );

  console.log("Done!");
  res.json(resultBlocks);
});

const server = app.listen(4009, "0.0.0.0", () =>
  console.log("Server is running...")
);

function formatLangs(langs: string[]) {
  return langs.map((lang) => {
    if (lang === "en") return "en-US";
    return lang as deepl.TargetLanguageCode;
  });
}
