// ย้ายข้อมูลจากโฟลเดอร์ R Dolls เดิมขึ้น Supabase — รันครั้งเดียว
//
//   cd ~/Desktop/r-dolls
//   npm i @supabase/supabase-js
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate.mjs "/Users/creative/Desktop/R Dolls"
//
// ใช้ service_role key เพราะสคริปต์นี้ไม่ได้ล็อกอินเป็นคน จึงต้องข้ามกฎ RLS
// อย่า commit key นี้ลง git และอย่าเอาไปใส่ในหน้าเว็บเด็ดขาด
//
// รันซ้ำได้ ถ้าเจ้าไหนมีอยู่แล้วจะข้าม ไม่สร้างซ้ำ

import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = process.argv[2];
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!ROOT || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ใช้: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate.mjs <โฟลเดอร์ R Dolls>");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const BUCKET = "supplier-images";
const IMG_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
               ".gif": "image/gif", ".avif": "image/avif", ".bmp": "image/bmp" };

// ตรรกะเดียวกับที่ index.html เคยใช้อ่าน info.txt
const KEYS = { web:"เว็บไซต์", phone:"เบอร์", line:"LINE", spec:"สเปก", lead:"ระยะเวลาผลิต",
               cover:"รูปปก", price:"ราคา", note:"หมายเหตุ" };
const KEY_RE = new RegExp("^\\s*(" + Object.values(KEYS).join("|") + ")\\s*:(.*)$");

function parseInfo(text) {
  const d = { web:"", phone:"", line:"", spec:"", lead:"", cover:"", note:"", rates:[] };
  let inPrice = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const m = line.match(KEY_RE);
    if (m) {
      const [, label, val] = [m[0], m[1], m[2].trim()];
      inPrice = false;
      const key = Object.keys(KEYS).find(k => KEYS[k] === label);
      if (key === "price") inPrice = true;
      else if (key) d[key] = val;
      continue;
    }
    if (inPrice) {
      const p = line.match(/^\s*([\d.,]+)\s*=\s*([\d.,]+)/);
      if (p) d.rates.push({ qty: p[1].trim(), price: p[2].trim() });
    }
  }
  return d;
}

async function listImages(dir) {
  try {
    const names = await readdir(dir);
    return names.filter(n => IMG_RE.test(n)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  } catch { return []; }
}

const entries = await readdir(ROOT, { withFileTypes: true });
let added = 0, skipped = 0, uploaded = 0;

for (const e of entries) {
  if (!e.isDirectory() || e.name.startsWith(".") || e.name.startsWith("_")) continue;
  const dir = join(ROOT, e.name);

  const { data: exists } = await sb.from("suppliers").select("id").eq("name", e.name).maybeSingle();
  if (exists) { console.log(`ข้าม  ${e.name} (มีอยู่แล้ว)`); skipped++; continue; }

  let info = "";
  try { info = await readFile(join(dir, "info.txt"), "utf8"); } catch {}
  const d = parseInfo(info);

  const { data: row, error } = await sb.from("suppliers")
    .insert({ name: e.name, web: d.web, phone: d.phone, line: d.line, spec: d.spec,
              lead: d.lead, note: d.note, cover: d.cover, rates: d.rates,
              updated_by: "migrate script" })
    .select("id").single();
  if (error) { console.error(`พลาด ${e.name}: ${error.message}`); continue; }

  // รูปเอาจาก Example/ ก่อน ถ้าไม่มีค่อยใช้รูปในโฟลเดอร์ supplier เอง (เหมือนแอปเดิม)
  let base = join(dir, "Example");
  let names = await listImages(base);
  if (!names.length) { base = dir; names = await listImages(base); }

  for (const n of names) {
    const buf = await readFile(join(base, n));
    const path = `${row.id}/${randomUUID()}${extname(n).toLowerCase()}`;
    const up = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType: MIME[extname(n).toLowerCase()] || "image/jpeg",
    });
    if (up.error) { console.error(`  อัป ${n} พลาด: ${up.error.message}`); continue; }
    await sb.from("supplier_images").insert({ supplier_id: row.id, name: n, path });
    uploaded++;
  }

  console.log(`เพิ่ม ${e.name} — ${names.length} รูป`);
  added++;
}

console.log(`\nเสร็จ: เพิ่ม ${added} เจ้า, ข้าม ${skipped} เจ้า, อัปรูป ${uploaded} ไฟล์`);
console.log("ตรวจต่อ: เปิดเว็บแล้วเทียบกับ info.txt เดิมทีละช่องว่าครบไหม");
