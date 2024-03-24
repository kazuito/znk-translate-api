import express from "express";
import * as deepl from "deepl-node";
import bodyParser from "body-parser";
import { Translator } from "./translate";
import { logger } from "./logger";
import { config } from "dotenv";
import path from "path";
import { isAvailableTargetLang } from "./utils";

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
      throw new Error("Invalid access key");
    } else if (!input.deeplApiKey) {
      throw new Error("Deepl API key is not provided");
    }

    const targetLangs = Object.values(input.targetLang);

    logger.trace(`Target languages: ${targetLangs.join(", ")}`);

    const formattedTargetLangs = formatLangs(targetLangs);

    // Check if the target languages are valid
    formattedTargetLangs.forEach((lang) => {
      if (!isAvailableTargetLang(lang)) {
        throw new Error(`Invalid target language: '${lang}'`);
      }
    });

    const resultBlocks = await Promise.all(
      formattedTargetLangs.map(async (targetLang) => {
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
  } catch (err: any) {
    logger.error(err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(Number(process.env.PORT), "0.0.0.0", () =>
  console.log(`Server is running on port ${process.env.PORT}...`)
);

function formatLangs(langs: string[]) {
  return langs.map((lang) => {
    if (lang === "en") return "en-US";
    if (lang === "pt") return "pt-PT";

    return lang as deepl.TargetLanguageCode;
  });
}
