/** 极简折线：只用点数组，不需要坐标轴 */
export function Spark({ points = [], height = 34, color }) {
  if (!points || points.length < 2) {
    return <div style={`height:${height}px`} />
  }

  const w = 300
  const h = height
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1

  const pts = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      class="spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={`height:${height}px;${color ? `color:${color}` : ''}`}
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  )
}
