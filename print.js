const fs = require("fs");
const qr = require("qr-image");

function printParticipant(doc, participant, font) {
  doc.addPage();

  const height = doc.page.height;
  const width = doc.page.width - 20;

  doc.image("images/badge.png", 0, 0, {
    height,
    width: doc.page.width,
  });

  // Profile picture
  if (participant.image) {
    const imageWidth = 120;
    doc.image(
      participant.image,
      (doc.page.width - imageWidth) / 2,
      170 - imageWidth,
      {
        width: imageWidth,
      },
    );
  }

  // Main name
  const name = participant.nickName || participant.realName;
  doc.font(font).fontSize(36).fillColor("#ffffff");
  if (doc.widthOfString(name) > width) {
    doc.fontSize(30);
    if (doc.widthOfString(name) > width) {
      doc.fontSize(26);
    }
  }
  doc.text(name, 10, 180, {
    align: "center",
    height,
    width,
  });

  // Real name (only if there's nick name also)
  if (participant.realName && participant.nickName) {
    doc
      .font(font)
      .fontSize(20)
      .fillColor("#ffffff")
      .text(participant.realName, 10, 220, {
        align: "center",
        height,
        width,
      });
  }

  // QR code
  const qrWidth = 80;
  const qrImage = qr.imageSync(participant.email, { type: "png" });
  doc.image(qrImage, (doc.page.width - qrWidth) / 2, height - 100 - qrWidth, {
    width: qrWidth,
  });
}

module.exports = { printParticipant };
