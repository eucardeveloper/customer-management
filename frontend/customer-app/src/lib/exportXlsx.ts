/**
 * Builds a formatted .xlsx in the browser (ExcelJS is loaded on demand, so it is not part of the first page load).
 * Header band, borders, zebra rows, real numbers/dates with number formats, frozen header row, filter buttons
 * and an optional totals row, so the file looks finished when a customer opens it.
 */
export type XlsxCell = string | number | Date | null | undefined;

export interface XlsxColumn<Row> {
  header: string;
  width: number;
  value: (row: Row) => XlsxCell;
  format?: 'text' | 'integer' | 'money' | 'date';
  align?: 'left' | 'center' | 'right';
  /** Optional pill colours for a cell (ARGB without the alpha prefix, e.g. 'DCFCE7'). */
  badge?: (row: Row) => { bg: string; fg: string } | undefined;
  /** Add a SUM(...) of this column in a totals row. */
  total?: boolean;
}

export interface XlsxOptions<Row> {
  fileName: string;
  sheetName: string;
  columns: XlsxColumn<Row>[];
  rows: Row[];
  dateFormat: string;
  totalLabel: string;
}

const BORDER = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
const ALL_BORDERS = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
const NUMBER_FORMAT = { text: '@', integer: '0', money: '"$"#,##0.00' };

export async function downloadXlsx<Row>(opts: XlsxOptions<Row>): Promise<void> {
  const mod = await import('exceljs');
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Customer Management System';
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheetName.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = opts.columns.map((c) => ({ width: c.width }));

  const header = ws.addRow(opts.columns.map((c) => c.header));
  header.height = 24;
  header.eachCell((cell, col) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: opts.columns[col - 1].align ?? 'left' };
    cell.border = ALL_BORDERS;
  });

  opts.rows.forEach((row, index) => {
    const excelRow = ws.addRow(opts.columns.map((c) => c.value(row) ?? ''));
    excelRow.height = 20;
    excelRow.eachCell({ includeEmpty: true }, (cell, col) => {
      const column = opts.columns[col - 1];
      cell.border = ALL_BORDERS;
      cell.alignment = { vertical: 'middle', horizontal: column.align ?? (column.format === 'money' || column.format === 'integer' ? 'right' : 'left') };
      if (column.format === 'date') cell.numFmt = opts.dateFormat;
      else if (column.format) cell.numFmt = NUMBER_FORMAT[column.format];
      const badge = column.badge?.(row);
      if (badge) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${badge.bg}` } };
        cell.font = { bold: true, color: { argb: `FF${badge.fg}` } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  if (opts.rows.length > 0 && opts.columns.some((c) => c.total)) {
    const first = 2;
    const last = opts.rows.length + 1;
    const totals = ws.addRow(
      opts.columns.map((c, i) => {
        if (c.total) {
          const letter = ws.getColumn(i + 1).letter;
          return { formula: `SUM(${letter}${first}:${letter}${last})` };
        }
        return i === 0 ? opts.totalLabel : '';
      }),
    );
    totals.height = 22;
    totals.eachCell({ includeEmpty: true }, (cell, col) => {
      const column = opts.columns[col - 1];
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = { ...ALL_BORDERS, top: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
      cell.alignment = { vertical: 'middle', horizontal: column.format === 'money' || column.format === 'integer' ? 'right' : 'left' };
      if (column.total && column.format && column.format !== 'date') cell.numFmt = NUMBER_FORMAT[column.format];
    });
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: opts.columns.length } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = opts.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
