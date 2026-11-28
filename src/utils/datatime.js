/** DB và server chạy UTC, chỉ đổi sang Asia/Ho_Chi_Minh khi hiển thị (DESIGN 4.1). */
const TZ = 'Asia/Ho_Chi_Minh';

function vnParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(date));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** ISO 8601 có offset +07:00, ví dụ 2026-12-20T07:30:00+07:00 (API 2.4) */
function toVNIso(date) {
  if (!date) return null;
  const p = vnParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+07:00`;
}

/** Hiển thị cho người dùng: 20/12/2026 07:30 */
function formatDateTimeVN(date) {
  if (!date) return '';
  const p = vnParts(date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** Ngày hôm nay theo giờ VN, dạng YYYY-MM-DD */
function todayVN(now = new Date()) {
  const p = vnParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Cộng/trừ ngày cho chuỗi YYYY-MM-DD (tính theo lịch, không phụ thuộc múi giờ máy) */
function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = { TZ, toVNIso, formatDateTimeVN, todayVN, addDays };
