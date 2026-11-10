-- 0002: giới hạn tốc độ cho các route công khai (mở đơn, lấy lại link tải).
-- Không sửa 0001. Chạy lại nhiều lần an toàn.
--
-- Cửa sổ cố định: mỗi (bucket, cửa sổ thời gian) một dòng, tăng đếm nguyên tử bằng một câu lệnh
-- INSERT ... ON CONFLICT, nên nhiều yêu cầu đồng thời vẫn đếm đúng. Bucket do ứng dụng băm từ IP hoặc email,
-- bảng không giữ địa chỉ thô.

create table if not exists public.engine_rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
create index if not exists engine_rate_limits_window_idx on public.engine_rate_limits (window_start);

alter table public.engine_rate_limits enable row level security;
-- Không có policy nào: chỉ service role (bỏ qua RLS) đọc ghi được. Thu hồi luôn quyền bảng của anon và authenticated.
revoke all on table public.engine_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.engine_rate_limits to service_role;

-- Trả true nếu lần gọi này còn nằm trong hạn mức p_limit của cửa sổ p_window_seconds giây.
create or replace function public.engine_rate_limit_hit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  w timestamptz;
  n integer;
begin
  if p_bucket is null or length(p_bucket) = 0 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'tham số giới hạn tốc độ không hợp lệ' using errcode = '22023';
  end if;
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.engine_rate_limits as r (bucket, window_start, hits)
  values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into n;
  -- Dọn dần các cửa sổ cũ để bảng không phình; mỗi lần gọi chỉ có 2% xác suất phải dọn.
  if random() < 0.02 then
    delete from public.engine_rate_limits where window_start < now() - interval '2 days';
  end if;
  return n <= p_limit;
end $$;

-- Hàm trong schema public mặc định ai cũng gọi được qua PostgREST, kể cả khóa công khai.
-- Chỉ service role (server của cửa hàng) được gọi.
revoke all on function public.engine_rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.engine_rate_limit_hit(text, integer, integer) to service_role;
