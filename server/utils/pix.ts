function crc16(payload: string): string {
  let crc = 0xFFFF
  for (const char of payload) {
    crc ^= char.charCodeAt(0) << 8
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
    }
    crc &= 0xFFFF
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function emv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`
}

function sanitize(s: string, maxLen = 25): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLen)
}

export function generatePixPayload(pixKey: string, merchantName: string, merchantCity = 'SAO PAULO'): string {
  const mai = emv('00', 'br.gov.bcb.pix') + emv('01', pixKey.trim())

  const payload = [
    emv('00', '01'),
    emv('01', '11'),
    emv('26', mai),
    emv('52', '0000'),
    emv('53', '986'),
    emv('58', 'BR'),
    emv('59', sanitize(merchantName, 25)),
    emv('60', sanitize(merchantCity, 15)),
    emv('62', emv('05', '***')),
    '6304',
  ].join('')

  return payload + crc16(payload)
}
