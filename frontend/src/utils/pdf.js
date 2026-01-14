import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const safeText = (v) => {
    const s = String(v ?? '').trim();
    return s || '';
};

const blobToJpegDataUrl = async (blob, { quality = 0.92 } = {}) => {
    const objectUrl = URL.createObjectURL(blob);
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('Failed to decode image'));
            el.src = objectUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 1;
        canvas.height = img.naturalHeight || img.height || 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        return { dataUrl, format: 'JPEG' };
    } finally {
        try {
            URL.revokeObjectURL(objectUrl);
        } catch {
            // ignore
        }
    }
};

const toJpegDataUrl = async (url) => {
    const raw = String(url || '').trim();
    if (!raw) return { dataUrl: '', format: 'JPEG' };
    const res = await fetch(raw);
    if (!res.ok) throw new Error('Failed to load image');
    const blob = await res.blob();
    return await blobToJpegDataUrl(blob);
};

const addKeyValueTable = (doc, { x = 14, y = 0, labelWidth = 60, rowHeight = 7, rows = [] } = {}) => {
    let cursorY = y;

    const ensureSpace = () => {
        if (cursorY <= 270) return;
        doc.addPage();
        cursorY = 14;
    };

    for (const [label, value] of rows) {
        ensureSpace();
        doc.setFont('helvetica', 'bold');
        doc.text(String(label || ''), x, cursorY);
        doc.setFont('helvetica', 'normal');

        const text = safeText(value) || '—';
        const maxWidth = 190 - (x + labelWidth);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x + labelWidth, cursorY);

        cursorY += rowHeight * Math.max(1, lines.length);
    }

    return cursorY;
};

const drawSectionTitle = (doc, title, { x = 14, y = 0 } = {}) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(String(title || ''), x, y);
    doc.setDrawColor(153, 1, 0);
    doc.setLineWidth(0.4);
    doc.line(x, y + 2, 196, y + 2);
    return y + 8;
};

const drawField = (doc, { label, value, x, y, labelWidth = 28, maxWidth = 82 } = {}) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(String(label || ''), x, y);
    doc.setFont('helvetica', 'normal');
    const text = safeText(value) || '—';
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x + labelWidth, y);
    return y + 6 * Math.max(1, lines.length);
};

export async function exportReportToPdf({ filename, title, summaryLines = [], columns = [], rows = [] }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const stamp = new Date();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(safeText(title) || 'Report', 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generated: ${stamp.toLocaleString()}`, 14, 22);
    doc.text(`Rows: ${Array.isArray(rows) ? rows.length : 0}`, 14, 27);
    doc.setTextColor(0);

    let startY = 33;
    if (Array.isArray(summaryLines) && summaryLines.length) {
        const lines = summaryLines.flatMap((l) => doc.splitTextToSize(String(l ?? ''), 180));
        doc.setFontSize(10);
        doc.text(lines, 14, startY);
        startY += 6 * Math.max(1, lines.length) + 2;
    }

    const head = [columns.map((c) => safeText(c?.header))];
    const body = (rows || []).map((r) =>
        (columns || []).map((c) => {
            try {
                const v = typeof c?.value === 'function' ? c.value(r) : r?.[c.value];
                return safeText(v);
            } catch {
                return '';
            }
        })
    );

    autoTable(doc, {
        startY,
        head,
        body,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [249, 250, 251], textColor: 17, fontStyle: 'bold' },
        margin: { left: 10, right: 10 },
    });

    doc.save(filename || 'report.pdf');
}

export async function exportEmployeeDetailsToPdf({ filename, employee, photoUrl } = {}) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const stamp = new Date();

    const fullName = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Information of ${fullName || 'Employee'}`, 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generated: ${stamp.toLocaleString()}`, 14, 22);
    doc.setTextColor(0);

    let y = 30;
    y = drawSectionTitle(doc, 'Information', { x: 14, y });

    // Photo + basic info row
    const photoX = 14;
    const photoY = y;
    const photoW = 34;
    const photoH = 34;

    doc.setDrawColor(229, 231, 235);
    doc.rect(photoX, photoY, photoW, photoH);

    let hasPhoto = false;
    try {
        const { dataUrl } = await toJpegDataUrl(photoUrl);
        if (dataUrl) {
            doc.addImage(dataUrl, 'JPEG', photoX, photoY, photoW, photoH, undefined, 'FAST');
            hasPhoto = true;
        }
    } catch {
        hasPhoto = false;
    }

    if (!hasPhoto) {
        doc.setTextColor(140);
        doc.setFontSize(9);
        doc.text('No Photo', photoX + 8, photoY + 18);
        doc.setTextColor(0);
    }

    // Right of photo
    const infoX = photoX + photoW + 8;
    let infoY = photoY + 6;
    infoY = drawField(doc, { label: 'Employee ID:', value: employee?.employee_id, x: infoX, y: infoY, labelWidth: 30, maxWidth: 120 });
    infoY = drawField(doc, { label: 'Name:', value: fullName, x: infoX, y: infoY, labelWidth: 30, maxWidth: 120 });

    y = Math.max(photoY + photoH, infoY) + 10;

    // Two-column details like the modal
    const leftX = 14;
    const rightX = 110;
    let leftY = y;
    let rightY = y;

    rightY = drawField(doc, { label: 'Employment Status:', value: employee?.employment_status, x: rightX, y: rightY, labelWidth: 42, maxWidth: 80 });

    leftY = drawField(doc, { label: 'First Name:', value: employee?.first_name, x: leftX, y: leftY, labelWidth: 28, maxWidth: 78 });
    rightY = drawField(doc, { label: 'Last Name:', value: employee?.last_name, x: rightX, y: rightY, labelWidth: 28, maxWidth: 80 });

    leftY = drawField(doc, { label: 'Department:', value: employee?.department_name || employee?.departments?.department_name || 'N/A', x: leftX, y: leftY, labelWidth: 28, maxWidth: 78 });
    rightY = drawField(doc, { label: 'Position:', value: employee?.position_title || employee?.positions?.position_title || 'N/A', x: rightX, y: rightY, labelWidth: 28, maxWidth: 80 });

    leftY = drawField(doc, { label: 'Personnel Type:', value: employee?.personnel_type, x: leftX, y: leftY, labelWidth: 32, maxWidth: 74 });
    rightY = drawField(doc, { label: 'Hire Date:', value: employee?.hire_date, x: rightX, y: rightY, labelWidth: 28, maxWidth: 80 });

    y = Math.max(leftY, rightY) + 8;

    if (y > 260) {
        doc.addPage();
        y = 14;
    }

    y = drawSectionTitle(doc, 'Personal Information', { x: 14, y });

    leftY = y;
    rightY = y;
    leftY = drawField(doc, { label: 'Birth Date:', value: employee?.birth_date, x: leftX, y: leftY, labelWidth: 26, maxWidth: 80 });
    rightY = drawField(doc, { label: 'Phone No.:', value: employee?.phone_number, x: rightX, y: rightY, labelWidth: 26, maxWidth: 80 });

    y = Math.max(leftY, rightY) + 2;
    y = drawField(doc, { label: 'Home Address:', value: employee?.address, x: leftX, y, labelWidth: 32, maxWidth: 150 });
    y = drawField(doc, { label: 'Emergency Contact Name:', value: employee?.emergency_contact_name, x: leftX, y, labelWidth: 55, maxWidth: 127 });
    y = drawField(doc, { label: 'Emergency Contact No.:', value: employee?.emergency_contact_number, x: leftX, y, labelWidth: 55, maxWidth: 127 });

    doc.save(filename || 'employee-details.pdf');
}
