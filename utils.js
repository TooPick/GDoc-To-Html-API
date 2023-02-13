import fs from "fs";
import mammoth from "mammoth";
import axios from "axios";
import extract from "extract-zip";
import { resolve } from "path";
import htmlInlineExternal from "html-inline-external";

import logger from "./winstonConfig.js";

const INPUT_DIR = process.env.INPUT_DIR;
const EXTRACT_DIR = process.env.EXTRACT_DIR;
const API_KEY = process.env.GOOGLE_API_KEY;

const UNLINK_TIMEOUT = 500;

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
        }, UNLINK_TIMEOUT);
      } catch (err) {
        logger.error(`[Utils - convertDocxToHtml]`, err);
      }
    })
    .done();
  return promise;
}

function findHtmlFile(folder) {
  const extension = ".html";
  const files = fs.readdirSync(folder);
  return files.filter((file) =>
    file.match(new RegExp(`.*\.(${extension})$`, "ig"))
  );
}

function unbackslash(s) {
  const text = s.replace(/\\([\\rnt'"])/g, function (match, p1) {
    if (p1 === "n") return "\n";
    if (p1 === "r") return "\r";
    if (p1 === "t") return "\t";
    if (p1 === "\\") return "\\";
    return p1; // unrecognised escape
  });
  return text.replace(/"/g, "'");
}

async function transformHtmlFile(htmlFile) {
  const result = await htmlInlineExternal({ src: htmlFile });
  return unbackslash(result);
}

async function extractHtmlFromZip(filename, autoDeleteZip) {
  const path = INPUT_DIR + filename;
  const fileNameSplit = filename.split(".");
  const relativeTarget = EXTRACT_DIR + fileNameSplit[0] + "/";
  const target = resolve(relativeTarget);

  logger.info(`[Utils - extractHtmlFromZip] Extracting '${path}' zip file.`);

  let data = null;
  try {
    await extract(path, { dir: target });
    logger.info(
      `[Utils - extractHtmlFromZip] Extraction of '${path}' complete.`
    );
    const htmlFiles = findHtmlFile(relativeTarget);
    if (htmlFiles && htmlFiles.length > 0) {
      // Transform html folder into inline file
      data = await transformHtmlFile(relativeTarget + htmlFiles[0]);

      // Delete extraction folder
      try {
        setTimeout(() => {
          fs.rmSync(relativeTarget, { recursive: true, force: true });
          logger.info(
            `[Utils - extractHtmlFromZip] Extraction folder '${relativeTarget}' successfully deleted.`
          );
        }, UNLINK_TIMEOUT);
      } catch (err) {
        logger.error(`[Utils - extractHtmlFromZip]`, err);
      }
    }
  } catch (err) {
    logger.error(`[Utils - extractHtmlFromZip]`, err);
  }

  // Delete input zip
  if (autoDeleteZip) {
    try {
      setTimeout(() => {
        fs.unlinkSync(path);
        logger.info(
          `[Utils - extractHtmlFromZip] Temp zip file '${path}' successfully deleted.`
        );
      }, UNLINK_TIMEOUT);
    } catch (err) {
      logger.error(`[Utils - extractHtmlFromZip]`, err);
    }
  }

  return data;
}

async function getFromGoogleDrive(fileUrl) {
  logger.info(
    `[Utils - getFromGoogleDrive] Getting Google Doc file from url: "${fileUrl}".`
  );
  const mimeType = "application/zip";

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

  let httpResponse;
  try {
    httpResponse = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        Accept: mimeType,
      },
    });
  } catch (err) {
    logger.warn(
      `[Utils - getFromGoogleDrive] Error [${err.response.status}]: ${err.response.statusText}`
    );
    return null;
  }

  const fileTitle = await getFileTitle(fileId);

  const extension = ".zip";
  const tempFilename = new Date().getTime();
  const filename = tempFilename + extension;

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
  return { filename, fileTitle };
}

async function getFileTitle(fileId) {
  const url =
    "https://www.googleapis.com/drive/v3/files/" + fileId + "?key=" + API_KEY;
  logger.info(
    `[Utils - getFileTitle] Trying to get the file title with Google API : "${url}".`
  );

  const httpResponse = await axios.get(url, {
    responseType: "application/json",
  });

  return JSON.parse(await httpResponse.data).name;
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

export default {
  convertDocxToHtml,
  getFromGoogleDrive,
  extractFileId,
  extractHtmlFromZip,
};
