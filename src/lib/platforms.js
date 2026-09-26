// RAWG parent-platform slugs -> short tag / full name.
export const PLATFORM_TAGS = {
  pc: 'PC',
  playstation: 'PS',
  xbox: 'XB',
  nintendo: 'NS',
  mac: 'MAC',
  linux: 'LNX',
  ios: 'iOS',
  android: 'AND',
  web: 'WEB',
}

export const PLATFORM_NAMES = {
  pc: 'PC',
  playstation: 'PlayStation',
  xbox: 'Xbox',
  nintendo: 'Nintendo',
  mac: 'macOS',
  linux: 'Linux',
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
}

// Parent-platform ids for RAWG's parent_platforms filter.
export const PLATFORM_FILTERS = [
  { key: 'all', label: 'All platforms', ids: null },
  { key: 'pc', label: 'PC', ids: '1' },
  { key: 'playstation', label: 'PlayStation', ids: '2' },
  { key: 'xbox', label: 'Xbox', ids: '3' },
  { key: 'nintendo', label: 'Nintendo', ids: '7' },
  { key: 'mobile', label: 'Mobile', ids: '4,8' },
]

export const platformName = (slug) => PLATFORM_NAMES[slug] || slug
