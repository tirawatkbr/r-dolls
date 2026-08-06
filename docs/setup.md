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

## 4. ตั้งค่าการล็อกอิน (อีเมล + รหัสผ่าน)

ทีมเล็ก 2–5 คน ไม่ต้องพึ่ง OAuth เจ้าไหนเลย ผู้ดูแลสร้างบัญชีให้ทีละคน

1. Supabase → **Authentication → Sign In / Providers → Email**
   - **Confirm email: ปิด** — ไม่ต้องส่งอีเมลยืนยัน (อีเมลในตัวของ Supabase ส่งได้แค่ 2 ฉบับ/ชม.
     ทีมล็อกอินพร้อมกันคือพัง เราจึงเลี่ยงการส่งอีเมลทั้งหมด)
   - **Allow new users to sign up: ปิด** ← สำคัญ ไม่งั้นใครก็ยิง API สมัครบัญชีเองได้
     (สมัครได้ก็ยังไม่เห็นข้อมูล เพราะติด `allowed_emails` แต่ปิดไปเลยสะอาดกว่า)
2. **Authentication → Users → Add user → Create new user**
   - ใส่อีเมล + รหัสผ่านของคุณ ติ๊ก **Auto Confirm User**
   - ทำซ้ำให้เพื่อนทุกคน แล้วส่งรหัสผ่านให้เขาทางช่องทางส่วนตัว

**ทำไมไม่ใช้ Google:** โควตาสร้างโปรเจกต์ของ Google Cloud เต็ม ขอเพิ่มใช้เวลาหลายวัน
และการเปลี่ยนมาใช้รหัสผ่านไม่ได้ลดความปลอดภัยของข้อมูล เพราะตัวกันจริงคือ RLS + `allowed_emails`
ซึ่งไม่เกี่ยวกับว่าล็อกอินมาด้วยวิธีไหน

---

## 5. บอก Supabase ว่าเว็บอยู่ที่ไหน

Supabase → **Authentication → URL Configuration**
- **Site URL:** `https://tirawatkbr.github.io/r-dolls`
- **Redirect URLs:** เพิ่ม `https://tirawatkbr.github.io/r-dolls/**`

การล็อกอินด้วยรหัสผ่านไม่มีการเด้งออกนอกเว็บ ข้อนี้จึงไม่จำเป็นเท่าตอนใช้ OAuth
แต่ตั้งไว้ให้ถูกก็ดี เผื่อวันหน้าเปิดลิงก์รีเซ็ตรหัสผ่าน

---

## 6. ใส่รายชื่อคนที่เข้าได้

Supabase → **Table Editor → `allowed_emails` → Insert row**
ใส่อีเมลเดียวกับที่สร้าง user ไว้ในข้อ 4 ให้ครบทุกคน ทีละแถว

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
