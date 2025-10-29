// تحديد التاريخ اليوم
export function setCurrentDate() {
    const now = new Date();
    const persianDate = new Date(now).toLocaleDateString('fa-IR');
    return persianDate;
}