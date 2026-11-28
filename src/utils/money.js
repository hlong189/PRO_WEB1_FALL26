/** Tiền VND là số nguyên (DESIGN 4.1). */
const formatVND = (n) => `${Number(n || 0).toLocaleString('vi-VN')}₫`;
module.exports = { formatVND };
