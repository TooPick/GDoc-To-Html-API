import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import Utils from "./utils.js";
import fs from "fs";

/**
 * -------------- GENERAL SETUP ----------------
 */

// Init winston logger
import logger from "./winstonConfig.js";

const app = express();
app.use(cors());
const upload = multer({ dest: "./input/" });

/**
 * -------------- SERVER ----------------
 */
const PORT = process.env.PORT;
app.listen(PORT, () => {
  logger.info(`Server listening on port : ${PORT}`); // Get and display app version number
  let rawData = fs.readFileSync("./package.json");
  let packageJson = JSON.parse(rawData);
  logger.info("App version: " + packageJson.version);
});

/**
 * -------------- ROUTES ----------------
 */
app.post("/convert", upload.single("file"), (req, res) => {
  logger.info(`[API] Route : '/convert'`);
  const filename = req.file.filename;
  Utils.convertDocxToHtml(filename).then(function (result) {
    var html = result.value; // The generated HTML
    res.status(200).send(html);
  });
});

app.get("/getAndConvert", (req, res) => {
  logger.info(
    `[API] Route : '/getAndConvert' with query params ${JSON.stringify(
      req.query
    )}`
  );
  if (req.query.url) {
    Utils.getFromGoogleDrive(req.query.url).then(({ filename, fileTitle }) => {
      if (filename !== null) {
        Utils.extractHtmlFromZip(filename, true).then(function (html) {
          res.status(200).json({ title: fileTitle, html });
        });
      }
    });
  }
});
