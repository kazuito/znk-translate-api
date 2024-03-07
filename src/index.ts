import express from "express";
import * as deepl from "deepl-node";
import bodyParser from "body-parser";
import { objTranslate } from "./translate";

const app = express();

type Input = {
  contents: { [key: string]: string };
  sourceLang: deepl.SourceLanguageCode;
  targetLang: deepl.TargetLanguageCode | deepl.TargetLanguageCode[];
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/translate", async (req, res) => {
  // console.log(req.body);

  const input: Input = req.body;
  const targetLangs = Array.isArray(input.targetLang)
    ? input.targetLang
    : [input.targetLang];

  // console.log(targetLangs);

  const resultBlocks = await Promise.all(
    targetLangs.map(async (targetLang) => {
      const newContents = await objTranslate(
        input.contents,
        input.sourceLang,
        targetLang
      );

      return {
        contents: newContents,
        lang: targetLang,
      };
    })
  );

  res.json(resultBlocks);
});

const server = app.listen(3000, () => console.log("Server is running..."));