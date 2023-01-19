import fs from "fs";
import mammoth from "mammoth";
import axios from "axios";

import logger from "./winstonConfig.js";

const INPUT_DIR = process.env.INPUT_DIR;
const API_KEY = process.env.GOOGLE_API_KEY;

function convertDocxToHtml(filename) {
  const path = INPUT_DIR + filename;
  logger.info(`[Utils - convertDocxToHtml] Converting file : '${path}'.`);

  const promise = mammoth.convertToHtml({ path });

  promise
    .then(() => {
      try {
        setTimeout(() => {
          fs.unlinkSync(path);
          logger.info(
            `[Utils - convertDocxToHtml] Temp file '${path}' successfully deleted.`
          );
        }, 500);
      } catch (err) {
        logger.error(`[Utils - convertDocxToHtml]`, err);
      }
    })
    .done();
  return promise;
}

async function getFromGoogleDrive(fileUrl) {
  logger.info(
    `[Utils - getFromGoogleDrive] Getting Google Doc file from url: "${fileUrl}".`
  );
  const mimeType =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const fileId = extractFileId(fileUrl);

  const url =
    "https://www.googleapis.com/drive/v3/files/" +
    fileId +
    "/export?mimeType=" +
    mimeType +
    "&key=" +
    API_KEY;
  logger.info(
    `[Utils - getFromGoogleDrive] Trying to export file with Google API : "${url}".`
  );

  const httpResponse = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Accept: mimeType,
    },
  });

  const filename = new Date().getTime().toString() + ".docx";

  try {
    fs.writeFileSync(INPUT_DIR + filename, httpResponse.data);
    logger.info(
      `[Utils - getFromGoogleDrive] File written successfully : '${
        INPUT_DIR + filename
      }'.`
    );
  } catch (err) {
    logger.error(`[Utils - getFromGoogleDrive]`, err);
  }

  return filename;
}

function extractFileId(fileUrl) {
  const split = fileUrl.split("/");
  for (let i = 0; i < split.length; i++) {
    if (split[i] === "d") {
      return split[i + 1];
    }
  }

  return null;
}

export default { convertDocxToHtml, getFromGoogleDrive, extractFileId };
