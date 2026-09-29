import type { GlobalThemeOverrides } from 'naive-ui'

/** "Noćna utrka": the legacy yellow (#FFEB3A) and aqua (#40C4FF), deepened into gradients. Mirrored in styles/theme.css. */
const PALETTE = {
  gold: '#FFB52E',
  goldText: '#1A0D00',
  aqua: '#3CC0F5',
  aquaDeep: '#1B7FE0',
  aquaText: '#03121C',
} as const

const buttonText = (prefix: 'Primary' | 'Info', color: string) =>
  Object.fromEntries(
    ['', 'Hover', 'Pressed', 'Focus', 'Disabled'].map((state) => [`textColor${state}${prefix}`, color]),
  )

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    primaryColor: PALETTE.gold,
    primaryColorHover: '#FFC553',
    primaryColorPressed: '#F59A1F',
    primaryColorSuppl: '#FFC553',
    infoColor: PALETTE.aqua,
    infoColorHover: '#5FCCF7',
    infoColorPressed: PALETTE.aquaDeep,
    infoColorSuppl: '#5FCCF7',
  },
  Button: {
    fontWeight: '600',
    ...buttonText('Primary', PALETTE.goldText),
    ...buttonText('Info', PALETTE.aquaText),
  },
}
