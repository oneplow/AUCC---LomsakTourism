// วันเปิดของสถานที่ เก็บเป็นสตริง "0,6" (0 = อาทิตย์ ... 6 = เสาร์ ตาม Date.getDay)
// ค่าว่าง/NULL = เปิดทุกวัน

export const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export const DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
// ลำดับแสดงผลในฟอร์ม เริ่มวันจันทร์
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function parseOpenDays(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const days = [
    ...new Set(
      String(value)
        .split(',')
        .map((d) => parseInt(d, 10))
        .filter((d) => d >= 0 && d <= 6)
    ),
  ].sort((a, b) => a - b);
  return days.length === 0 || days.length === 7 ? null : days;
}

// แปลงกลับเป็นสตริงสำหรับบันทึก (ทุกวัน/ไม่เลือก → null)
export function serializeOpenDays(value) {
  const days = Array.isArray(value) ? parseOpenDays(value.join(',')) : parseOpenDays(value);
  return days ? days.join(',') : null;
}

export const isOpenOn = (openDays, weekday) => {
  const days = parseOpenDays(openDays);
  return !days || days.includes(weekday);
};

export function formatOpenDays(value) {
  const days = parseOpenDays(value);
  if (!days) return 'เปิดทุกวัน';
  const key = days.join(',');
  if (key === '1,2,3,4,5') return 'วันจันทร์-ศุกร์';
  if (key === '0,6') return 'วันเสาร์-อาทิตย์';
  return `เฉพาะวัน${WEEK_ORDER.filter((d) => days.includes(d))
    .map((d) => DAY_NAMES[d])
    .join(', ')}`;
}
