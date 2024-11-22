const fs = require("fs");
const { pipeline } = require("stream/promises");
const request = require("request");
const sharp = require("sharp");

const magic = require("./magic");
const overrides = require("./overrides");

const ATTENDING_YES = "Kyllä / Yes";
const ATTENDING_NO = "En / No";

function download(uri, filename) {
  return new Promise((resolve) => {
    if (fs.existsSync(filename)) {
      resolve(filename);
    } else {
      request.head(uri, function (err, res, body) {
        const contentType = res.headers["content-type"];
        const contentLength = res.headers["content-length"];
        if (contentType !== "image/jpeg" && contentType !== "image/png") {
          resolve();
        } else if (!contentLength) {
          resolve();
        } else {
          const prefix = contentType === "image/jpeg" ? "jpg" : "png";
          const filenameWithPrefix = `${filename}.${prefix}`;
          const stream = fs.createWriteStream(filenameWithPrefix);
          request(uri)
            .pipe(stream)
            .on("close", () => {
              resolve(filenameWithPrefix);
            });
        }
      });
    }
  });
}

async function roundedImage(input, output) {
  if (fs.existsSync(output)) {
    return output;
  }

  const roundedCorners = Buffer.from(
    '<svg><rect x="0" y="0" width="512" height="512" rx="512" ry="512"/></svg>',
  );

  const roundedCornerResizer = sharp()
    .resize(512, 512)
    .composite([
      {
        input: roundedCorners,
        blend: "dest-in",
      },
    ])
    .png();

  await pipeline(
    fs.createReadStream(input),
    roundedCornerResizer,
    fs.createWriteStream(output),
  );

  return output;
}

async function getParticipants(csvFile) {
  const tempImagesDir = "tmp";
  if (!fs.existsSync(tempImagesDir)) {
    fs.mkdirSync(tempImagesDir);
  }

  const [header, ...rows] = fs
    .readFileSync(csvFile)
    .toLocaleString()
    .split("\n")
    .map((line) =>
      line
        .split(",")
        .map((part) => part.replace(/^"(.+(?="$))"$/, "$1").trim()),
    );

  const uniqueRows = Object.values(
    rows.reduce((prev, curr) => {
      const email = curr[1];
      const attending = curr[3];
      if (attending === ATTENDING_NO) {
        const next = { ...prev };
        delete next[email];
        return next;
      }

      if (attending === ATTENDING_YES) {
        return {
          ...prev,
          [email]: curr,
        };
      }

      return prev;
    }, {}),
  );

  return await Promise.all(
    uniqueRows.map(async (column) => {
      let result;
      try {
        const term = column[2]
          .toLowerCase()
          .replace(/\u00e5/g, "a") // å -> a
          .replace(/\u00e4/, "a") // ä -> a
          .replace(/\u00f6/, "o") // ö -> o
          .replace(/\s+/g, " ")
          .replace(/[^a-z ]/g, "");

        const results = await magic.doSearch(term);
        if (results && results[0]) {
          result = results[0];
        }
      } catch (err) {
        console.error("Search failed", column[2].toLowerCase(), err);
      }

      const email = column[1];

      const realName = result?.rn || overrides[email]?.realName || column[2];

      let nickName = result?.dn || overrides[email]?.nickName;
      if (nickName === realName) {
        nickName = undefined;
      }

      const imageUrl =
        result?.im || (email ? overrides[email]?.image : undefined);
      let image;
      if (imageUrl) {
        const imageName = realName.toLowerCase().replace(/[^a-z]/g, "");
        const normalImage = await download(
          imageUrl,
          `${tempImagesDir}/${imageName}`,
        );
        if (normalImage) {
          image = await roundedImage(
            normalImage,
            `${tempImagesDir}/${imageName}_rounded.png`,
          );
        }
      }

      return { email, realName, nickName, image };
    }),
  );
}

module.exports = { getParticipants };
