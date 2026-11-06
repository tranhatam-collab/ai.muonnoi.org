-- 0003: hoàn tiền. Đảo sổ cái bằng dòng âm và chặn chuyển trạng thái đơn sai luồng.
-- Không sửa 0001. Chạy lại nhiều lần an toàn.

-- Sổ cái có hai loại dòng: bán (sale) và hoàn (refund).
-- Dòng bán giữ nguyên cách cũ: order_id trỏ về đơn, duy nhất theo chỉ mục của 0001 (không đụng tới chỉ mục đó,
-- nên chạy lại cả chuỗi migration vẫn không lỗi). Dòng hoàn không dùng order_id mà dùng refund_of_order_id,
-- duy nhất theo chỉ mục riêng, nên một đơn có tối đa một dòng bán và một dòng hoàn.
alter table public.engine_revenue add column if not exists kind text not null default 'sale' check (kind in ('sale', 'refund'));
alter table public.engine_revenue add column if not exists refund_of_order_id uuid references public.store_orders(id) on delete set null;
create unique index if not exists engine_revenue_refund_uidx on public.engine_revenue (refund_of_order_id) where refund_of_order_id is not null;

-- Ghi sổ khi đơn chuyển sang paid (dòng dương) hoặc từ paid sang refunded (dòng âm bằng đúng số đã ghi lúc bán).
create or replace function public.engine_record_order_revenue() returns trigger
language plpgsql as $$
declare
  rate numeric;
  sale_vnd numeric;
begin
  select nullif(value, '')::numeric into rate from public.engine_settings where key = 'usd_vnd_rate';
  if rate is null then rate := 26000; end if;

  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    insert into public.engine_revenue (occurred_on, channel, description, amount, currency, amount_vnd, source_ref, order_id, kind)
    values (
      (coalesce(new.paid_at, now()) at time zone 'Asia/Ho_Chi_Minh')::date,
      'store_' || new.provider,
      'Đơn ' || new.order_code || ' / ' || new.product_id,
      new.amount,
      new.currency,
      case when new.currency = 'VND' then round(new.amount) else round(new.amount * rate) end,
      new.order_code::text,
      new.id,
      'sale'
    )
    on conflict (order_id) where order_id is not null do nothing;
  elsif tg_op = 'UPDATE' and new.status = 'refunded' and old.status = 'paid' then
    select amount_vnd into sale_vnd from public.engine_revenue where order_id = new.id;
    if sale_vnd is null then
      sale_vnd := case when new.currency = 'VND' then round(new.amount) else round(new.amount * rate) end;
    end if;
    insert into public.engine_revenue (occurred_on, channel, description, amount, currency, amount_vnd, source_ref, refund_of_order_id, kind)
    values (
      public.engine_today(),
      'store_' || new.provider,
      'Hoàn tiền đơn ' || new.order_code || ' / ' || new.product_id,
      -new.amount,
      new.currency,
      -sale_vnd,
      new.order_code::text || ':refund',
      new.id,
      'refund'
    )
    on conflict (refund_of_order_id) where refund_of_order_id is not null do nothing;
  end if;
  return new;
end $$;

-- Luồng trạng thái hợp lệ của đơn:
--   pending, cancelled, expired -> paid     (tiền về, kể cả về muộn sau khi link hết hạn)
--   pending -> cancelled | expired
--   paid -> refunded                         (không quay lại được)
-- Mọi bước khác bị chặn ở tầng DB, để một webhook gửi lại không thể làm sống lại đơn đã hoàn tiền.
create or replace function public.engine_guard_order_status() returns trigger
language plpgsql as $$
begin
  if old.status = new.status then
    return new;
  end if;
  if old.status = 'refunded' then
    raise exception 'đơn đã hoàn tiền, không đổi trạng thái được' using errcode = '23514';
  end if;
  if old.status = 'paid' and new.status <> 'refunded' then
    raise exception 'đơn đã trả chỉ được chuyển sang hoàn tiền' using errcode = '23514';
  end if;
  if new.status = 'refunded' and old.status <> 'paid' then
    raise exception 'chỉ đơn đã trả mới hoàn tiền được' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists store_orders_status_guard on public.store_orders;
create trigger store_orders_status_guard before update of status on public.store_orders
  for each row execute function public.engine_guard_order_status();
