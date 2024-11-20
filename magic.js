// "magic.js" gotten from Aarni Koskela (@akx)
// https://github.com/akx

// Database is not supplied, as it contains personal information.
// If you need it, get it from @akx.
const db = new Map(require("./magic.json"));

function toBase64(buffer) {
  const buf = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...buf));
}

function fromBase64(str) {
  return Uint8Array.from([...atob(str)].map((c) => c.charCodeAt(0)));
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  return await crypto.subtle.digest("SHA-256", msgBuffer);
}

async function aesCbcDecrypt(base64Bytes, key) {
  const decKey = await crypto.subtle.importKey("raw", key, "AES-CBC", true, [
    "decrypt",
  ]);
  const fullBuf = fromBase64(base64Bytes);
  const iv = fullBuf.slice(0, 16);
  const ciphertext = fullBuf.slice(16);
  return crypto.subtle.decrypt({ name: "AES-CBC", iv }, decKey, ciphertext);
}

async function doSearch(search) {
  const res = [];
  const ents = db.get(toBase64(await sha256("kk2024~" + search)));
  if (!ents) return [];
  let decKeyBits = new Array(search.length).fill(search).join("x");
  const decKey = await sha256(decKeyBits);
  for (const ent of ents) {
    const plain = new TextDecoder().decode(await aesCbcDecrypt(ent, decKey));
    const json = JSON.parse(plain);
    if (json.im) {
      json.im = json.im.replace("^se", "https://avatars.slack-edge.com/");
    }
    res.push(json);
  }
  return res;
}

module.exports = { doSearch };
