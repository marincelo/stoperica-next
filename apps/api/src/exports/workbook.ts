import ExcelJS from 'exceljs'

export type Cell = string | number | null

export interface Column {
  header: string
  width: number
}

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }
const GROUP_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } }

/** One-sheet workbook with a bold, frozen header row. */
export class SheetBuilder {
  readonly workbook = new ExcelJS.Workbook()
  private readonly sheet: ExcelJS.Worksheet

  constructor(
    name: string,
    private readonly columns: Column[],
  ) {
    this.workbook.creator = 'Stoperica.live'
    // Excel limits sheet names to 31 characters.
    this.sheet = this.workbook.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] })
    this.sheet.columns = columns.map((c) => ({ width: c.width }))
    const header = this.sheet.addRow(columns.map((c) => c.header))
    header.font = { bold: true }
    header.eachCell((cell) => {
      cell.fill = HEADER_FILL
      cell.border = { bottom: { style: 'thin' } }
    })
  }

  /** Grey, merged, centred row naming the group (category or gender) that follows. */
  group(label: string) {
    const row = this.sheet.addRow([label])
    this.sheet.mergeCells(row.number, 1, row.number, this.columns.length)
    const cell = row.getCell(1)
    cell.fill = GROUP_FILL
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center' }
  }

  row(values: Cell[]) {
    this.sheet.addRow(values)
  }

  async toBuffer(): Promise<Buffer> {
    return Buffer.from(await this.workbook.xlsx.writeBuffer())
  }
}

/** Numeric strings ("12") become numbers so Excel doesn't flag "number stored as text". */
export function numeric(value: string | null | undefined): Cell {
  if (value == null || value === '') return null
  return /^\d+$/.test(value) ? Number(value) : value
}
