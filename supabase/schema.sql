-- R Dolls — โครงฐานข้อมูลและกฎความปลอดภัย
-- วางทั้งไฟล์นี้ใน Supabase → SQL Editor → Run
--
-- หลักคิด: หน้าเว็บเป็นสาธารณะ กุญแจ anon key จึงเปิดเผยอยู่แล้วโดยการออกแบบ
-- ความปลอดภัยทั้งหมดอยู่ที่ RLS ข้างล่างนี้ — ปฏิเสธทุกอย่างก่อน แล้วเปิดเฉพาะ
-- อีเมลที่อยู่ในตาราง allowed_emails เท่านั้น "ล็อกอินแล้ว" อย่างเดียวไม่พอ
-- เพราะบัญชีอาจถูกสร้างเพิ่มทีหลังโดยที่ยังไม่ได้รับสิทธิ์ดูข้อมูล

-- ───────────────────────── ตาราง ─────────────────────────

-- รายชื่ออีเมลที่เข้าใช้ได้ เพิ่ม/ถอนคนทำที่ตารางนี้ที่เดียว
create table if not exists public.allowed_emails (
  email      text primary key,
  note       text,
  added_at   timestamptz not null default now()
);

create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  web         text not null default '',
  phone       text not null default '',
  line        text not null default '',
  spec        text not null default '',   -- คั่นด้วย | เหมือน info.txt เดิม
  lead        text not null default '',   -- ระยะเวลาผลิต
  note        text not null default '',
  cover       text not null default '',   -- ชื่อไฟล์รูปปก
  rates       jsonb not null default '[]'::jsonb,   -- [{"qty":"จำนวน","price":"ราคาต่อชิ้น"}]
  is_fav      boolean not null default false,       -- ดาวร่วมกันทั้งทีม
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists public.supplier_images (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references public.suppliers(id) on delete cascade,
  name         text not null,              -- ชื่อไฟล์ที่ผู้ใช้เห็น
  path         text not null unique,       -- path จริงใน storage bucket
  created_at   timestamptz not null default now()
);

create index if not exists supplier_images_supplier_idx on public.supplier_images(supplier_id);

-- ───────────────── บันทึกว่าใครแก้ล่าสุด ─────────────────

create or replace function public.stamp_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end;
$$;

drop trigger if exists suppliers_stamp_updated on public.suppliers;
create trigger suppliers_stamp_updated
  before insert or update on public.suppliers
  for each row execute function public.stamp_updated();

-- ───────────────── ตัวตัดสินสิทธิ์ตัวเดียวของระบบ ─────────────────
-- ทุก policy ข้างล่างเรียกฟังก์ชันนี้ ถ้าจะแก้เรื่องสิทธิ์ ให้แก้ที่นี่ที่เดียว
-- security definer เพื่อให้อ่าน allowed_emails ได้โดยไม่ติด RLS ของตัวมันเอง

create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table public.allowed_emails  enable row level security;
alter table public.suppliers       enable row level security;
alter table public.supplier_images enable row level security;

-- ล้าง policy เก่าก่อน เผื่อรันไฟล์นี้ซ้ำ
drop policy if exists allowed_emails_read on public.allowed_emails;
drop policy if exists suppliers_all       on public.suppliers;
drop policy if exists images_all          on public.supplier_images;

-- คนในทีมอ่านรายชื่อกันเองได้ (เว็บใช้เช็คว่าตัวเองผ่านไหม)
-- แต่ "แก้ไข" รายชื่อทำได้จากหน้า Supabase เท่านั้น ไม่มี policy ให้เขียนผ่านเว็บ
create policy allowed_emails_read on public.allowed_emails
  for select to authenticated
  using (public.is_allowed());

-- ข้อมูล supplier: คนในรายชื่อทำได้ทุกอย่าง คนนอกทำอะไรไม่ได้เลย
create policy suppliers_all on public.suppliers
  for all to authenticated
  using (public.is_allowed())
  with check (public.is_allowed());

create policy images_all on public.supplier_images
  for all to authenticated
  using (public.is_allowed())
  with check (public.is_allowed());

-- ไม่มี policy สำหรับ role "anon" เลยแม้แต่ข้อเดียว
-- แปลว่าคนที่ยังไม่ล็อกอินยิงมาด้วย anon key จะได้ผลลัพธ์ว่างเสมอ

-- ───────────────────────── ที่เก็บรูป ─────────────────────────

insert into storage.buckets (id, name, public)
values ('supplier-images', 'supplier-images', false)   -- false = ต้องมีลิงก์ชั่วคราวถึงจะเปิดดูได้
on conflict (id) do update set public = false;

drop policy if exists supplier_images_bucket_all on storage.objects;

create policy supplier_images_bucket_all on storage.objects
  for all to authenticated
  using (bucket_id = 'supplier-images' and public.is_allowed())
  with check (bucket_id = 'supplier-images' and public.is_allowed());

-- ───────────────────────── หลังรันเสร็จ ─────────────────────────
-- 1. ไป Table Editor → allowed_emails → ใส่อีเมลของคุณกับเพื่อน (ต้องตรงกับ user ใน Authentication)
-- 2. ทดสอบว่ากฎทำงาน โดยยิงแบบไม่ล็อกอิน (ดูขั้นตอนใน README) ต้องได้ [] ไม่ใช่ข้อมูล
