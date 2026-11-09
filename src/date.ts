export const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

export const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const pad = (value: number) => String(value).padStart(2, '0')

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year || 2000, (month || 1) - 1, day || 1)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDays(iso: string, amount: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + amount)
  return toISODate(date)
}

export function formatLong(iso: string): string {
  const date = parseISODate(iso)
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatShort(iso: string): string {
  const date = parseISODate(iso)
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDayMonth(iso: string): string {
  const date = parseISODate(iso)
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string): string {
  const monthIndex = Number(key.slice(5, 7)) - 1
  return `${MONTHS[monthIndex] ?? key} ${key.slice(0, 4)}`
}

export function shiftMonth(key: string, amount: number): string {
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5, 7)) - 1 + amount
  const date = new Date(year, month, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function monthMatrix(key: string): (string | null)[][] {
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5, 7)) - 1
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const totalDays = new Date(year, month + 1, 0).getDate()

  const cells: (string | null)[] = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(`${year}-${pad(month + 1)}-${pad(day)}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (string | null)[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }
  return weeks
}

export function startOfWeek(iso: string): string {
  const date = parseISODate(iso)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return toISODate(date)
}

export function daysUntil(iso: string): number {
  const target = parseISODate(iso).getTime()
  const now = parseISODate(todayISO()).getTime()
  return Math.round((target - now) / 86_400_000)
}

export function minutesBetween(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  if ([startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value))) {
    return 0
  }
  const diff = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return diff > 0 ? diff : 0
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 j'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} mnt`
  return rest === 0 ? `${hours} j` : `${hours} j ${rest} mnt`
}

export function hoursDecimal(minutes: number): string {
  return (minutes / 60).toFixed(1).replace('.', ',')
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}
