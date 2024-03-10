import express from "express";
import * as deepl from "deepl-node";
import bodyParser from "body-parser";
import { Translator } from "./translate";
import { logger } from "./logger";
import { config } from "dotenv";
import path from "path";

config({
  path: path.join(__dirname, "../.env"),
});

const app = express();

type Input = {
  contents: { [key: string]: string };
  sourceLang: deepl.SourceLanguageCode;
  targetLang: deepl.TargetLanguageCode | deepl.TargetLanguageCode[];
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/translate", async (req, res) => {
  logger.trace("## Translation Request ##");

  try {
    const input: Input = req.body;
    const targetLangs = Array.isArray(input.targetLang)
      ? input.targetLang
      : [input.targetLang];

    logger.trace(`Target languages: ${targetLangs.join(", ")}`);

    const formattedTargetLangs = formatLangs(targetLangs);

    const resultBlocks = [];

    for (const targetLang of formattedTargetLangs) {
      logger.trace(`Translating to ${targetLang}...`);

      const translator = new Translator(
        input.sourceLang,
        targetLang,
        input.contents
      );

      const newContents = await translator.translate();

      resultBlocks.push({
        contents: newContents,
        lang: targetLang,
      });
    }
    logger.trace("Done!");
    res.json(resultBlocks);
  } catch (err) {
    logger.error("Error: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const server = app.listen(Number(process.env.PORT), "0.0.0.0", () =>
  console.log("Server is running...")
);

function formatLangs(langs: string[]) {
  return langs.map((lang) => {
    if (lang === "en") return "en-US";
    if (lang === "pt") return "pt-PT";
    return lang as deepl.TargetLanguageCode;
  });
}
