// ค่าเชื่อมต่อ Supabase — ทั้งสองค่านี้ "เปิดเผยได้" ตามการออกแบบของ Supabase
// ความปลอดภัยอยู่ที่กฎ RLS ในฐานข้อมูล ไม่ใช่ที่การซ่อนกุญแจนี้
// ห้ามเอา service_role / sb_secret_ key มาใส่ที่นี่เด็ดขาด — พวกนั้นข้ามกฎ RLS ได้ทั้งหมด
//
// หาค่าได้ที่ Supabase → Settings → API Keys (ฝั่ง anon / publishable)
window.RDOLLS_CONFIG = {
  SUPABASE_URL: "https://afvrsjhmlrqjvwdbbyhy.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_n89bsgO2WjeYIsXGUZI3Ag_DAmYzAXj",
};
