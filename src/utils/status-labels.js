/* Ánh xạ trạng thái nghiệp vụ -> nhãn tiếng Việt -> màu badge (DESIGN 16.10). Dùng chung toàn dự án. */
const MAP = {
  trip: { draft: ['Nháp', 'neutral'], active: ['Đang mở bán', 'success'], departed: ['Đã xuất bến', 'info'],
          completed: ['Hoàn thành', 'neutral'], cancelled: ['Đã hủy', 'danger'] },
  booking: { pending: ['Chờ thanh toán', 'warning'], confirmed: ['Đã xác nhận', 'success'],
             cancelled: ['Đã hủy', 'danger'], expired: ['Hết hạn', 'danger'] },
  payment: { pending: ['Đang xử lý', 'info'], success: ['Thành công', 'success'],
             failed: ['Thất bại', 'danger'], refunded: ['Đã hoàn tiền', 'neutral'] },
  ticket: { valid: ['Hợp lệ', 'success'], checked_in: ['Đã check-in', 'info'], cancelled: ['Đã hủy', 'danger'] },
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function badge(type, value) {
  const [label, tone] = (MAP[type] && MAP[type][value]) || [esc(value), 'neutral'];
  return `<span class="badge-status badge-${tone}">${label}</span>`;
}
module.exports = { badge, MAP };
