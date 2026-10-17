const status = document.getElementById('sampleStatus');
const formats = {caption:'Caption',short_video:'Kịch bản video ngắn',carousel:'Carousel',article:'Bài dài'};
try {
  const response = await fetch('/offers/sample/data.json',{credentials:'omit'});
  if (!response.ok) throw new Error('unavailable');
  const sample = await response.json();
  if (sample.fictional !== true || sample.status !== 'DRAFT_ONLY' || sample.assets.length !== 12 || sample.calendar.length !== 14) throw new Error('unverified');
  for (const day of sample.calendar) {
    const li = document.createElement('li');const title = document.createElement('b');const body = document.createElement('p');
    title.textContent = `Ngày ${day.day} · ${day.asset_id || 'Đối chiếu và bàn giao'}`;
    body.textContent = day.review_requirement;li.append(title,body);document.getElementById('sampleCalendar').append(li);
  }
  for (const asset of sample.assets) {
    const block = document.createElement('details');const title = document.createElement('summary');const meta = document.createElement('p');const copy = document.createElement('div');
    title.textContent = `${asset.id} · ${asset.title}`;
    meta.className = 'sample-meta';meta.textContent = `${formats[asset.format] || asset.format} · ${asset.primary_channel} · Bản nháp minh họa, cần duyệt`;
    copy.className = 'sample-copy';copy.textContent = asset.content;block.append(title,meta,copy);document.getElementById('sampleAssets').append(block);
  }
  status.textContent='Đã tải đủ 12 bản nháp và lịch minh họa 14 ngày.';
} catch {status.textContent='Chưa tải được bộ mẫu. Hãy thử lại hoặc tải tệp JSON ở liên kết phía trên.';}
