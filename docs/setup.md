# ขั้นตอนตั้งค่าครั้งแรก

ทำครั้งเดียว ประมาณ 30 นาที ทำตามลำดับ อย่าข้าม

---

## 1. สร้าง 2 repo บน GitHub

| repo | สถานะ | เก็บอะไร |
|---|---|---|
| `r-dolls` | **Public** | โค้ดเว็บ (repo นี้) |
| `r-dolls-data` | **Private** | ข้อมูลสำรองรายวัน |

ต้องแยกกัน เพราะ repo โค้ดต้องสาธารณะเพื่อใช้ GitHub Pages ฟรี
แต่ข้อมูลราคา/ผู้ผลิตห้ามสาธารณะ

---

## 2. สร้างโปรเจกต์ Supabase

1. [supabase.com](https://supabase.com) → Sign in with GitHub → **New project**
2. ชื่อ `r-dolls`, region เลือก **Southeast Asia (Singapore)** (ใกล้ไทยที่สุด)
3. ตั้งรหัสฐานข้อมูล — เก็บไว้ให้ดี
4. รอสร้างเสร็จ ~2 นาที
5. ไป **Settings → API** จดค่าไว้ 3 อย่าง:

| ค่า | เอาไปใช้ที่ | ลับไหม |
|---|---|---|
| Project URL | `config.js` + GitHub secret | ไม่ลับ |
| `anon` `public` key | `config.js` | ไม่ลับ (ออกแบบมาให้เปิดเผย) |
| `service_role` key | GitHub secret ของ repo สำรองเท่านั้น | **ลับมาก** ข้ามกฎ RLS ได้ทั้งหมด |

---

## 3. สร้างตารางและกฎความปลอดภัย

Supabase → **SQL Editor** → New query → วางทั้งไฟล์ `supabase/schema.sql` → **Run**

ต้องขึ้น Success ถ้าแดงให้อ่าน error แล้วแก้ก่อนไปต่อ

---

## 4. เปิดล็อกอินด้วย Google

1. Supabase → **Authentication → Providers → Google** — คัดลอก **Callback URL** ที่แสดงอยู่
2. ไป [console.cloud.google.com](https://console.cloud.google.com) → สร้างโปรเจกต์ใหม่
3. **APIs & Services → OAuth consent screen**
   - User Type: **External** → Create
   - App name ใส่ `R Dolls`, User support email + Developer contact ใส่อีเมลคุณ → Save
   - หน้า **Audience** → **Publish app** (ถ้าไม่ publish จะใช้ได้แค่ 100 คน แต่ก็พอสำหรับทีมเล็ก
     ถ้าไม่อยากผ่านการตรวจของ Google ให้เพิ่มอีเมลเพื่อนใน **Test users** แทน)
4. **Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs** → วาง Callback URL จากข้อ 1
   - Create → คัดลอก **Client ID** และ **Client secret**
5. กลับมา Supabase → Authentication → Providers → Google → เปิดสวิตช์
   วาง Client ID กับ Client secret → **Save**

---

## 5. บอก Supabase ว่าเว็บอยู่ที่ไหน

Supabase → **Authentication → URL Configuration**
- **Site URL:** `https://tirawatkbr.github.io/r-dolls`
- **Redirect URLs:** เพิ่ม `https://tirawatkbr.github.io/r-dolls/**`

ถ้าข้ามข้อนี้ ล็อกอินเสร็จแล้วจะเด้งไปหน้าอื่น

---

## 6. ใส่รายชื่อคนที่เข้าได้

Supabase → **Table Editor → `allowed_emails` → Insert row**
ใส่อีเมล **Google** ของคุณและเพื่อนทุกคน ทีละแถว

ถ้าไม่ใส่ จะล็อกอินได้แต่เห็นหน้า "ยังไม่ได้รับสิทธิ์"

---

## 7. ใส่กุญแจลงในไฟล์ config

แก้ `public/config.js` ใส่ Project URL กับ anon key จากข้อ 2 แล้ว commit + push

```js
window.RDOLLS_CONFIG = {
  SUPABASE_URL: "https://xxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbG...",
};
```

---

## 8. เปิด GitHub Pages

repo `r-dolls` → **Settings → Pages → Source: GitHub Actions** → Save
push ครั้งถัดไปจะ deploy อัตโนมัติ รอ ~1 นาทีแล้วเปิด `https://tirawatkbr.github.io/r-dolls`

---

## 9. ✋ ทดสอบความปลอดภัยก่อนใส่ข้อมูลจริง

**อย่าข้ามข้อนี้** ใส่ข้อมูลปลอม 1 แถวใน `suppliers` ผ่าน Table Editor แล้วรัน:

```bash
export SUPABASE_URL="https://xxxxx.supabase.co"
export ANON_KEY="eyJhbG..."
curl -s "$SUPABASE_URL/rest/v1/suppliers?select=*" \
     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```

- ได้ `[]` → ถูกต้อง ไปต่อได้
- ได้ข้อมูลออกมา → **หยุด** กฎ RLS ไม่ทำงาน ห้ามใส่ข้อมูลจริงเด็ดขาด กลับไปรัน `schema.sql` ใหม่

ลบข้อมูลปลอมทิ้งแล้วไปข้อถัดไป

---

## 10. ย้ายข้อมูลเดิมขึ้น Supabase

```bash
cd ~/Desktop/r-dolls
npm i @supabase/supabase-js
SUPABASE_URL="https://xxxxx.supabase.co" \
SUPABASE_SERVICE_KEY="eyJhbG...service_role..." \
node scripts/migrate.mjs "/Users/creative/Desktop/R Dolls"
```

เสร็จแล้วเปิดเว็บเทียบกับ `info.txt` เดิมทีละช่องว่าครบไหม

---

## 11. ตั้งค่าการสำรองข้อมูล

1. คัดลอกโฟลเดอร์ `~/Desktop/r-dolls-data` ขึ้น repo `r-dolls-data`
2. repo นั้น → **Settings → Secrets and variables → Actions → New repository secret**
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_KEY` = service_role key
3. ไปแท็บ **Actions** → เลือก "สำรองข้อมูลจาก Supabase" → **Run workflow** เพื่อทดสอบ
4. เช็คว่าได้โฟลเดอร์ `data/<ชื่อ supplier>/info.txt` + `Example/` หน้าตาเหมือนของเดิม

หลังจากนี้จะรันเองทุกวันตี 3 และการยิงนี้กันโปรเจกต์ Supabase ถูกพักไปในตัว
