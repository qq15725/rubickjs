const PI = Math.PI
const PI_2 = PI * 2
const FUNCTIONS_RE = /([\w-]+)\((.+?)\)/g
const ARGS_RE = /([^,]+)/g
const ARG_RE = /([-\d.]+)(.*)/

export function parseCssProperty(property: string) {
  const functions = parseCssFunctions(property)
  return functions.length
    ? functions
    : parseArg(property)
}

export function parseCssFunctions(value: string) {
  const functions = []
  let match
  // eslint-disable-next-line no-cond-assign
  while ((match = FUNCTIONS_RE.exec(value)) !== null) {
    const [, name, args] = match
    if (name) {
      functions.push({
        name,
        args: parseArgs(args),
      })
    }
  }
  return functions
}

function parseArgs(args: string) {
  const values = []
  let match
  // eslint-disable-next-line no-cond-assign
  while ((match = ARGS_RE.exec(args)) !== null) {
    values.push(parseArg(match[0]))
  }
  return values
}

function parseArg(arg: string) {
  const matched = arg.match(ARG_RE)
  const value = Number(matched?.[1])
  const unit = matched?.[2]
  let normalized: number
  switch (unit) {
    case '%':
      normalized = value / 100
      break
    case 'rad':
      normalized = value / PI_2
      break
    case 'deg':
      normalized = value / 360
      break
    case 'turn':
    case 'px': // div width or height
    case 'em': // div fontSize
    case 'rem': // div fontSize
    default:
      normalized = value
      break
  }
  return { value, unit, normalized }
}
