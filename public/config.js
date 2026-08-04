// ค่าเชื่อมต่อ Supabase — ทั้งสองค่านี้ "เปิดเผยได้" ตามการออกแบบของ Supabase
// ความปลอดภัยอยู่ที่กฎ RLS ในฐานข้อมูล ไม่ใช่ที่การซ่อนกุญแจนี้
// ห้ามเอา service_role key มาใส่ที่นี่เด็ดขาด — อันนั้นข้ามกฎ RLS ได้ทั้งหมด
//
// หาค่าได้ที่ Supabase → Settings → API
window.RDOLLS_CONFIG = {
  SUPABASE_URL: "PASTE_PROJECT_URL_HERE",
  SUPABASE_ANON_KEY: "PASTE_ANON_KEY_HERE",
};
