export const SESSION_COOKIE = 'sp_session'
export const SESSION_VALUE = 'authenticated'

export function checkPin(input: string): boolean {
  const pin = process.env.APP_PIN
  if (!pin) return false
  return input === pin
}
