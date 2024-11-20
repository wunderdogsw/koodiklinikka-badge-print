const fs = require("fs");
const { pipeline } = require("stream/promises");
const request = require("request");
const sharp = require("sharp");

const magic = require("./magic");

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
          const stream = fs.createWriteStream(filename);
          request(uri)
            .pipe(stream)
            .on("close", () => {
              resolve(filename);
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

  return await Promise.all(
    rows.map(async (column) => {
      let result;
      try {
        const results = await magic.doSearch(column[2].toLowerCase());
        if (results && results[0]) {
          result = results[0];
        }
      } catch (err) {
        console.error("Search failed", column[2].toLowerCase(), err);
      }

      const email = column[1];

      const realName = result?.rn || column[2];

      let nickName;
      if (result?.dn && result.dn !== realName) {
        nickName = result.dn;
      }

      let image;
      if (result && result.im) {
        const imageName = realName.toLowerCase().replace(/[^a-z]/g, "");
        const prefix = result.im.split(".").pop();
        const normalImage = await download(
          result.im,
          `${tempImagesDir}/${imageName}.${prefix}`,
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
