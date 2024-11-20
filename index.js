const fs = require("fs");
const PDFDocument = require("pdfkit");

const { getParticipants } = require("./participants");
const { printParticipant } = require("./print");

// CSV file can be downloaded from Google Forms:
// https://docs.google.com/forms/d/19hFOpZ2vhFOjZDEiJzaMkxO2npVUkOqgiHK6lp-LRe0
const CSV_FILE = "Koodiklinikan pikkujoulut perjantaina 22.11.2024.csv";

// Font needs to be downloaded from WD GDrive:
// https://drive.google.com/file/d/1mG94pqS5hAUhVxBbPz5kRyFrqH7b69XJ/view?usp=drive_link
const FONT = "fonts/apercu-regular-pro.ttf";

const OUTPUT_FILE = "badges.pdf";

(async function print() {
  console.log(`Started creating ${OUTPUT_FILE}...`);

  const filename = OUTPUT_FILE;

  // Create a document
  doc = new PDFDocument({
    size: [315, 436],
    autoFirstPage: false,
  });

  doc.pipe(fs.createWriteStream(filename));

  const participants = await getParticipants(CSV_FILE);
  for (const participant of participants) {
    printParticipant(doc, participant, FONT);
  }

  // Finalize PDF file
  doc.end();

  console.log("Finished creating " + filename);
})();
