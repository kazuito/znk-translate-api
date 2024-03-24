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
  accessKey: string;
  deeplApiKey: string;
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

    if (input.accessKey !== process.env.ZNK_TRANSLATOR_ACCESS_KEY) {
      logger.warn("Invalid access key");
      return res.status(401).json({ error: "Invalid access key" });
    } else if (!input.deeplApiKey) {
      logger.warn("Deepl API key is not provided");
      return res.status(401).json({ error: "Deepl API key is not provided" });
    }

    const targetLangs = Object.values(input.targetLang);

    logger.trace(`Target languages: ${targetLangs.join(", ")}`);

    const formattedTargetLangs = formatLangs(targetLangs);

    const resultBlocks = await Promise.all(
      formattedTargetLangs.map(async (targetLang) => {
        logger.trace(`Translating to ${targetLang}...`);

        const translator = new Translator(
          input.deeplApiKey,
          input.sourceLang,
          targetLang,
          input.contents
        );

        await translator.checkAvailability();

        const newContents = await translator.translate();

        return {
          lang: targetLang,
          contents: newContents,
        };
      })
    );

    logger.trace("Done!");
    res.json(resultBlocks);
  } catch (err) {
    logger.error("Error: " + err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const server = app.listen(Number(process.env.PORT), "0.0.0.0", () =>
  console.log(`Server is running on port ${process.env.PORT}...`)
);

function formatLangs(langs: string[]) {
  return langs.map((lang) => {
    if (lang === "en") return "en-US";
    if (lang === "pt") return "pt-PT";
    return lang as deepl.TargetLanguageCode;
  });
}
