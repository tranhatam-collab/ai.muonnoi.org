-- Money Engine: cửa hàng ebook + sổ cái doanh thu + hàng chờ duyệt + báo cáo ngày.
-- Mọi bảng nằm trong schema public với tiền tố store_/engine_ để PostgREST thấy được.
-- RLS bật trên mọi bảng: chỉ service role (server) đọc/ghi; riêng sản phẩm đang bán thì ai cũng đọc được.

create extension if not exists pgcrypto;

-- Hôm nay theo giờ Việt Nam.
create or replace function public.engine_today() returns date
language sql stable as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;

create table if not exists public.store_products (
  id text primary key,
  title text not null,
  title_en text,
  subtitle text,
  author text not null default 'Trần Hà Tâm',
  lang text not null default 'vi' check (lang in ('vi','en')),
  description_md text,
  price_vnd integer check (price_vnd is null or price_vnd >= 1000),
  price_usd numeric(10,2) check (price_usd is null or price_usd >= 0.5),
  file_path text,
  bundle_items text[],
  words integer,
  cover_color text,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_code bigint not null unique,
  product_id text not null references public.store_products(id),
  provider text not null check (provider in ('payos','paypal','manual')),
  currency text not null check (currency in ('VND','USD')),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled','expired','refunded')),
  buyer_email text,
  buyer_name text,
  provider_ref text,
  provider_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists store_orders_status_created_idx on public.store_orders (status, created_at desc);
create index if not exists store_orders_buyer_email_idx on public.store_orders (buyer_email);
create index if not exists store_orders_provider_ref_idx on public.store_orders (provider, provider_ref);

create table if not exists public.store_order_events (
  id bigserial primary key,
  order_id uuid references public.store_orders(id) on delete cascade,
  kind text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists store_order_events_order_idx on public.store_order_events (order_id, created_at);

create table if not exists public.store_downloads (
  id bigserial primary key,
  order_id uuid references public.store_orders(id) on delete cascade,
  product_id text references public.store_products(id),
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.engine_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
insert into public.engine_settings (key, value) values
  ('usd_vnd_rate', '26000'),
  ('daily_target_vnd_min', '100000'),
  ('daily_target_vnd_max', '500000')
on conflict (key) do nothing;

-- Sổ cái doanh thu mọi kênh (cửa hàng tự ghi; KDP/Gumroad/B2B ghi tay hoặc qua tác vụ hằng ngày).
create table if not exists public.engine_revenue (
  id bigserial primary key,
  occurred_on date not null,
  channel text not null,
  description text,
  amount numeric(14,2) not null,
  currency text not null,
  amount_vnd numeric(14,0) not null,
  source_ref text,
  order_id uuid references public.store_orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists engine_revenue_day_idx on public.engine_revenue (occurred_on desc);
create unique index if not exists engine_revenue_order_uidx on public.engine_revenue (order_id) where order_id is not null;

-- Những việc cần người thật bấm (gửi email, đăng KDP, đổi giá...).
create table if not exists public.engine_approvals (
  id bigserial primary key,
  kind text not null,
  title text not null,
  body_md text,
  payload jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','done','expired')),
  due_on date,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists engine_approvals_status_idx on public.engine_approvals (status, created_at);

-- Bài viết SEO tự sinh.
create table if not exists public.engine_content (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  target_site text not null default 'store',
  product_id text references public.store_products(id),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  url text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.engine_daily_reports (
  report_date date primary key,
  revenue_vnd numeric(14,0) not null default 0,
  orders_paid integer not null default 0,
  approvals_pending integer not null default 0,
  summary_md text,
  created_at timestamptz not null default now()
);

create or replace function public.engine_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists store_products_updated_at on public.store_products;
create trigger store_products_updated_at before update on public.store_products
  for each row execute function public.engine_set_updated_at();
drop trigger if exists store_orders_updated_at on public.store_orders;
create trigger store_orders_updated_at before update on public.store_orders
  for each row execute function public.engine_set_updated_at();

-- Đơn chuyển sang 'paid' thì tự ghi một dòng vào sổ cái doanh thu.
create or replace function public.engine_record_order_revenue() returns trigger
language plpgsql as $$
declare
  rate numeric;
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    select nullif(value, '')::numeric into rate from public.engine_settings where key = 'usd_vnd_rate';
    if rate is null then rate := 26000; end if;
    insert into public.engine_revenue (occurred_on, channel, description, amount, currency, amount_vnd, source_ref, order_id)
    values (
      (coalesce(new.paid_at, now()) at time zone 'Asia/Ho_Chi_Minh')::date,
      'store_' || new.provider,
      'Đơn ' || new.order_code || ' / ' || new.product_id,
      new.amount,
      new.currency,
      case when new.currency = 'VND' then round(new.amount) else round(new.amount * rate) end,
      new.order_code::text,
      new.id
    )
    on conflict (order_id) where order_id is not null do nothing;
  end if;
  return new;
end $$;

drop trigger if exists store_orders_revenue on public.store_orders;
create trigger store_orders_revenue after insert or update on public.store_orders
  for each row execute function public.engine_record_order_revenue();

-- Views cho báo cáo ngày (security_invoker: tôn trọng RLS, anon không đọc được).
create or replace view public.engine_v_revenue_daily with (security_invoker = true) as
select occurred_on as day, sum(amount_vnd)::numeric(14,0) as revenue_vnd, count(*) as entries
from public.engine_revenue
group by occurred_on
order by occurred_on desc;

create or replace view public.engine_v_dashboard with (security_invoker = true) as
select
  public.engine_today() as today,
  (select coalesce(sum(amount_vnd), 0) from public.engine_revenue where occurred_on = public.engine_today()) as today_vnd,
  (select coalesce(sum(amount_vnd), 0) from public.engine_revenue where occurred_on >= public.engine_today() - 6) as last7_vnd,
  (select coalesce(sum(amount_vnd), 0) from public.engine_revenue where occurred_on >= date_trunc('month', public.engine_today())::date) as mtd_vnd,
  (select count(*) from public.store_orders where status = 'paid' and (paid_at at time zone 'Asia/Ho_Chi_Minh')::date = public.engine_today()) as orders_paid_today,
  (select count(*) from public.store_orders where status = 'pending' and created_at > now() - interval '1 day') as orders_pending_24h,
  (select count(*) from public.engine_approvals where status = 'pending') as approvals_pending,
  (select nullif(value, '')::numeric from public.engine_settings where key = 'daily_target_vnd_min') as target_min_vnd,
  (select nullif(value, '')::numeric from public.engine_settings where key = 'daily_target_vnd_max') as target_max_vnd;

-- RLS
alter table public.store_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_events enable row level security;
alter table public.store_downloads enable row level security;
alter table public.engine_settings enable row level security;
alter table public.engine_revenue enable row level security;
alter table public.engine_approvals enable row level security;
alter table public.engine_content enable row level security;
alter table public.engine_daily_reports enable row level security;

drop policy if exists "public read active products" on public.store_products;
create policy "public read active products" on public.store_products
  for select to anon, authenticated using (active);

-- Kho file ebook riêng tư (chỉ server ký link tải).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ebooks', 'ebooks', false, 52428800, array['application/epub+zip', 'application/pdf'])
on conflict (id) do nothing;

-- Seed: 5 cuốn FINAL + bản tiếng Anh + bộ 5 cuốn. Bản nháp để active = false.
insert into public.store_products
  (id, title, title_en, subtitle, lang, price_vnd, price_usd, words, cover_color, sort_order, active, file_path, bundle_items, description_md)
values
  ('tu-0-den-khong-gioi-han', 'Từ 0 Đến Không Giới Hạn', 'From Zero to Infinite', 'Sáng tạo trong im lặng', 'vi', 99000, 4.99, 56705, '#1f3a5f', 10, true, 'tu-0-den-khong-gioi-han.epub', null,
   'Ghi chép của một người bắt đầu từ con số không: không vốn, không tên tuổi, không công thức.

Cuốn sách không dạy cách khởi nghiệp. Nó quan sát điều gì xảy ra bên trong một người khi mọi điểm tựa bên ngoài chưa có, và sự sáng tạo bắt đầu từ im lặng.'),
  ('tan-cung-mot-cuoc-song', 'Tận Cùng Một Cuộc Sống', 'The Depth of a Single Life', null, 'vi', 99000, 4.99, null, '#3b3b3b', 20, true, 'tan-cung-mot-cuoc-song.epub', null,
   '**Tận Cùng Một Cuộc Sống** không phải là cuốn sách hướng dẫn bạn thay đổi.

Nó không đưa ra công thức, không hứa hẹn khai sáng, không tạo thêm một mục tiêu mới để theo đuổi. Cuốn sách đi vào một vùng lặng hơn: nơi một đời người nhìn lại những vai diễn, lựa chọn, tổn thương, bám víu và câu hỏi từng định nghĩa mình.

Qua từng chương, người đọc được mời đi chậm, nhìn lại mà không phán xét, rời mà không biến mất, và chạm đến một dạng tự do không cần người sở hữu.

*Đây là một cuốn sách để đọc ít, dừng lâu, và để khoảng trắng cuối cùng được sống trọn.*'),
  ('troi-sinh', 'Trồi Sinh', 'Emergence', 'Triết lý mới của một nền kinh tế thế giới', 'vi', 119000, 5.99, 77801, '#2f5d50', 30, true, 'troi-sinh.epub', null,
   'Một cách nhìn khác về kinh tế: không phải cỗ máy tăng trưởng, mà là một hệ sống đang trồi sinh.

Cuốn sách đi qua tiền tệ, lao động, doanh nghiệp và cộng đồng để hỏi một câu đơn giản: nền kinh tế này đang phục vụ sự sống nào?'),
  ('tri-tue-khong-nguon-goc', 'Trí Tuệ Không Nguồn Gốc', 'Originless Intelligence', null, 'vi', 119000, 5.99, 90208, '#4a3c6b', 40, true, 'tri-tue-khong-nguon-goc.epub', null,
   'Khi máy có thể viết, tính toán và trả lời thay con người, câu hỏi còn lại là: trí tuệ đến từ đâu?

Cuốn sách không chống lại công nghệ, cũng không tôn thờ nó. Nó lần theo một thứ trí tuệ không có nguồn gốc, có mặt trước mọi dữ liệu.'),
  ('99-thong-diep-song', '99 Thông Điệp Sống', '99 Cuts', null, 'vi', 49000, 2.99, 1028, '#8a4b2f', 50, true, '99-thong-diep-song.epub', null,
   '99 câu ngắn để đọc một câu mỗi ngày. Không giải thích, không hướng dẫn.

Mỗi thông điệp là một nhát cắt gọn vào thói quen nhìn cuộc sống theo lối cũ.'),
  ('from-zero-to-infinite', 'From Zero to Infinite', 'From Zero to Infinite', 'Creating in Silence', 'en', 99000, 3.99, 14693, '#1f3a5f', 60, true, 'from-zero-to-infinite.epub', null,
   'Notes from someone who started with nothing: no capital, no name, no formula.

This is not a book on how to start a business. It observes what happens inside a person when every outer support is missing, and creation begins in silence. English international edition.'),
  ('bo-5-cuon', 'Bộ 5 cuốn đầu tiên', 'The First Five', 'Từ 0 Đến Không Giới Hạn, Tận Cùng Một Cuộc Sống, Trồi Sinh, Trí Tuệ Không Nguồn Gốc, 99 Thông Điệp Sống', 'vi', 349000, 16.99, null, '#111827', 5, true, null,
   array['tu-0-den-khong-gioi-han','tan-cung-mot-cuoc-song','troi-sinh','tri-tue-khong-nguon-goc','99-thong-diep-song'],
   'Trọn bộ năm cuốn đầu tiên trong hệ sách thực hành của Trần Hà Tâm, giá tiết kiệm hơn mua lẻ. Nhận đủ năm file EPUB ngay sau khi thanh toán.'),
  ('khoi-nghiep-tinh-thuc', 'Khởi Nghiệp Tỉnh Thức', 'Conscious Startup', null, 'vi', 99000, 4.99, null, '#5b6b2f', 70, false, 'khoi-nghiep-tinh-thuc.epub', null, 'Bản nháp, chưa phát hành.'),
  ('doanh-nhan-sang-tao', 'Doanh Nhân Sáng Tạo', 'The Creative Entrepreneur', null, 'vi', 119000, 5.99, 45105, '#7a2f4a', 80, false, 'doanh-nhan-sang-tao.epub', null, 'Bản nháp đã khóa bản thảo, chờ duyệt phát hành.'),
  ('gia-tri-tu-than', 'Giá Trị Tự Thân', 'Intrinsic Worth', null, 'vi', 99000, 4.99, 31475, '#2f4a7a', 90, false, 'gia-tri-tu-than.epub', null, 'Bản nháp, chưa qua kiểm duyệt giọng văn.')
on conflict (id) do nothing;
