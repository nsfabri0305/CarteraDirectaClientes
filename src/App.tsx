import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase'

// ── Paleta de Colores ────────────────────────────────────────────────────────
const C = {
  bg:        '#f0f4f8',
  white:     '#ffffff',
  surface:   '#e8eef6',
  border:    '#c8d6e8',
  borderDk:  '#b0c2d8',
  navy:      '#0d2b5e',
  navyMid:   '#1a3a6b',
  navyLight: '#2e5599',
  celeste:   '#3a8fd1',
  celesteL:  '#6aaee8',
  text:      '#0d1f3c',
  textMid:   '#2e4870',
  textSoft:  '#6b84a8',
  blue1:     '#1565c0',
  blue2:     '#42a5f5',
  blue3:     '#e3f0fb',
  s1: '#1b8a3f',
  s2: '#c49a00',
  s3: '#9b1f7a',
  s4: '#0288d1',
  s5: '#d32f2f',
  s6: '#c2601a',
}

// ── Helpers de Formato y Lectura ─────────────────────────────────────────────
function formatDNI(val: any): string {
  if (!val) return '---'
  return String(val).trim().padStart(8, '0')
}

function formatPrestamo(val: any): string {
  if (!val) return '---'
  return String(val).trim().padStart(12, '0')
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

function getValue(obj: any, ...keys: string[]): string {
  if (!obj) return '---'

  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
      return String(obj[k]).trim()
    }
  }

  const objKeys = Object.keys(obj)
  const normalizedTargets = keys.map(normalizeKey)

  for (const target of normalizedTargets) {
    const matchedKey = objKeys.find(k => normalizeKey(k) === target)
    if (matchedKey && obj[matchedKey] !== undefined && obj[matchedKey] !== null) {
      const val = String(obj[matchedKey]).trim()
      if (val !== '') return val
    }
  }

  return '---'
}

function getActualKey(obj: any, ...keys: string[]): string | null {
  if (!obj) return null

  const objKeys = Object.keys(obj)

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return key
    }
  }

  const normalizedTargets = keys.map(normalizeKey)

  for (const target of normalizedTargets) {
    const matchedKey = objKeys.find(k => normalizeKey(k) === target)
    if (matchedKey) return matchedKey
  }

  return null
}

// Parsea y formatea el saldo para detectar si es 0 o dinero mayor a 0
function parseSaldo(val: any): { num: number; formatted: string } {
  if (!val || val === '---') return { num: 0, formatted: 'S/ 0.00' }
  const rawStr = String(val).trim()
  const cleanStr = rawStr.replace(/[^0-9.-]/g, '')
  const num = parseFloat(cleanStr) || 0

  let formatted = rawStr
  if (!rawStr.toUpperCase().includes('S/')) {
    formatted = `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return { num, formatted }
}

// ── Dashboards Power BI ──────────────────────────────────────────────────────
const DASHBOARDS = [
  {
    title: 'Monitoreo de créditos por cartera (Vencidos y no vencidos) - IFIA',
    fileName: 'Monitoreo de créditos por cartera (Vencidos y no vencidos) - IFIA.pbix',
    preview: '/powerbi/monitoreo-creditos-ifia.png',
    file: '/powerbi/monitoreo-creditos-ifia.pbix',
  },
  {
    title: 'Seguimiento de solicitudes de quejas y/o reclamos, requerimientos varios de los clientes de la Cartera Directa',
    fileName: 'Seguimiento de solicitudes de quejas yo reclamos, requerimientos varios de los clientes de la Cartera Directa.pbix',
    preview: '/powerbi/seguimiento-solicitudes-cartera-directa.png',
    file: '/powerbi/seguimiento-solicitudes-cartera-directa.pbix',
  },
]

// Distancia circular más corta entre el índice i y el índice actual,
// usada para el efecto "coverflow" (peeks a los lados).
function relOffset(i: number, current: number, n: number): number {
  if (n <= 0) return 0
  let diff = i - current
  while (diff > n / 2) diff -= n
  while (diff < -n / 2) diff += n
  return diff
}

function IconPowerBI({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="4" y="8" width="4" height="11" rx="1" fill="#f2c811"/><rect x="10" y="5" width="4" height="14" rx="1" fill="#f2c811" opacity=".88"/><rect x="16" y="2" width="4" height="17" rx="1" fill="#f2c811" opacity=".72"/></svg>
}
function IconMore({ color = C.textSoft }: { color?: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill={color}><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
}
function IconDownload({ size = 16, color = C.navy }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
}

// ── Iconos existentes ────────────────────────────────────────────────────────
function IconMail({ size = 15, color = C.celeste }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
}
function IconChevron({ open, color = C.textSoft }: { open: boolean; color?: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{transition:'transform .22s',transform:open?'rotate(180deg)':'rotate(0)'}}><path d="M6 9l6 6 6-6"/></svg>
}
function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textSoft} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
}

// ── Header Superior ──────────────────────────────────────────────────────────
function Header({
  onLogoClick,
  isUnlocked,
  onLockClick,
}: {
  onLogoClick: () => void
  isUnlocked: boolean
  onLockClick: () => void
}) {
  return (
    <header
      style={{
        flex: '0 0 62px',
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        boxSizing: 'border-box',
        background: C.navy,
        borderBottom: `1px solid ${C.navyMid}`,
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Candado: sin contraseña / con contraseña. Click abre el modal de contraseña
            (o vuelve a bloquear si ya está desbloqueado). */}
        <button
          onClick={onLockClick}
          title={isUnlocked ? 'Edición desbloqueada (clic para bloquear)' : 'Clic para desbloquear la edición'}
          aria-label={isUnlocked ? 'Bloquear edición' : 'Desbloquear edición'}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,.15)',
            border: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <img
            src={isUnlocked ? '/icons/unlocked.png' : '/icons/locked.png'}
            alt={isUnlocked ? 'Edición desbloqueada' : 'Edición bloqueada'}
            draggable={false}
            style={{ width: '18px', height: '18px', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
          />
        </button>

        <span
          style={{
            fontFamily: 'Outfit,sans-serif',
            fontWeight: 700,
            fontSize: '16px',
            letterSpacing: '.03em',
            color: '#fff',
          }}
        >
          Equipo Cartera Directa
        </span>
      </div>

      {/* Logo FMV como imagen. Sigue llevando al inicio, igual que antes. */}
      <button
        onClick={onLogoClick}
        aria-label="Ir al inicio"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          height: '32px',
        }}
      >
        <img
          src="/icons/logo-fmv.png"
          alt="FMV"
          draggable={false}
          style={{ height: '100%', width: 'auto', display: 'block', pointerEvents: 'none' }}
        />
      </button>
    </header>
  )
}

// ── Vista 1: Dashboards ──────────────────────────────────────────────────────
function View1({ onVerCartera }: { onVerCartera: () => void }) {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [dir, setDir] = useState<1 | -1>(1)
  const [isWide, setIsWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 900 : true
  )
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const goTo = (idx: number, d: 1 | -1) => {
    if (transitioning || idx === current) return

    setDir(d)
    setTransitioning(true)
    setCurrent(idx)

    window.setTimeout(() => {
      setTransitioning(false)
    }, 220)
  }

  const next = () => {
    goTo((current + 1) % DASHBOARDS.length, 1)
  }

  const prev = () => {
    goTo((current - 1 + DASHBOARDS.length) % DASHBOARDS.length, -1)
  }

  const dashboard = DASHBOARDS[current]

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDir(1)
      setTransitioning(true)
      setCurrent(prevIndex => (prevIndex + 1) % DASHBOARDS.length)

      window.setTimeout(() => {
        setTransitioning(false)
      }, 220)
    }, 8000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 32px 8px',
        overflow: 'hidden',
      }}
    >
      {/* Encabezado */}
      <div
        style={{
          flex: '0 0 38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '8px',
              fontWeight: 600,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: C.celeste,
              lineHeight: 1,
              marginBottom: '3px',
            }}
          >
            Reportes ejecutivos
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              lineHeight: 1,
              color: C.navy,
            }}
          >
            Dashboards
          </h1>
        </div>

        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '10px',
            fontWeight: 600,
            color: C.textSoft,
            whiteSpace: 'nowrap',
          }}
        >
          {current + 1} de {DASHBOARDS.length}
        </div>
      </div>

      {/* Área del dashboard. Todo lo que está aquí cabe en pantalla. */}
      <div
        style={{
          position: 'relative',
          flex: '1 1 auto',
          minHeight: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Peeks laterales (efecto "coverflow"): muestran de reojo el dashboard
            anterior/siguiente en el espacio en blanco a los costados. Solo se
            muestran los vecinos inmediatos (offset ±1) y solo en pantallas anchas. */}
        {isWide &&
          DASHBOARDS.map((d, i) => {
            const offset = relOffset(i, current, DASHBOARDS.length)
            if (Math.abs(offset) !== 1) return null
            const side: 1 | -1 = offset > 0 ? 1 : -1

            return (
              <button
                key={`peek-${i}`}
                onClick={() => goTo(i, side)}
                aria-label={`Ir a ${d.title}`}
                title={d.title}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width:
                    'min(calc(64% - 24px), calc((100dvh - 199px) * 1992 / 1152 * 0.86))',
                  aspectRatio: '1992 / 1152',
                  transform: `translate(calc(-50% + ${side * 66}%), -50%) scale(0.92)`,
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  boxShadow: '0 8px 24px rgba(13,43,94,.10)',
                  padding: 0,
                  cursor: 'pointer',
                  opacity: transitioning ? 0 : 0.85,
                  zIndex: 2,
                  transition: 'opacity .22s ease, transform .22s ease',
                }}
              >
                <img
                  src={d.preview}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'fill',
                    filter: 'saturate(0.7) brightness(0.97)',
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(240,244,248,0.22)' }} />
              </button>
            )
          })}

        {/* Flecha izquierda */}
        <button
          onClick={prev}
          aria-label="Dashboard anterior"
          style={{
            position: 'absolute',
            top: '50%',
            left: '2px',
            transform: 'translateY(-50%)',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: `1px solid ${C.border}`,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.96)',
            color: C.navyMid,
            fontFamily: 'Inter, sans-serif',
            fontSize: '24px',
            fontWeight: 400,
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(13,43,94,.10)',
            zIndex: 5,
          }}
        >
          ‹
        </button>

        {/* 
          ESTE ES EL PUNTO CLAVE DEL DISEÑO.

          El tamaño se calcula respetando simultáneamente:
          1. el ancho disponible
          2. el alto real disponible

          La imagen mantiene SIEMPRE 1992 / 1152.
          Así no se estira ni se deforma.
          Se reserva solo el espacio mínimo para el nombre y los indicadores.
        */}
        <div
          style={{
            position: 'relative',
            width: 'min(calc(100% - 96px), calc((100dvh - 199px) * 1992 / 1152))',
            maxWidth: '1992px',
            maxHeight: '100%',
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            boxSizing: 'border-box',
            zIndex: 4,
          }}
        >
          {/* Marco de la imagen: EXACTAMENTE 1992 × 1152 */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1992 / 1152',
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              overflow: 'hidden',
              boxSizing: 'border-box',
              boxShadow: '0 8px 24px rgba(13,43,94,.10)',
              opacity: transitioning ? 0 : 1,
              transform: transitioning
                ? `translateX(${dir * 16}px)`
                : 'translateX(0)',
              transition: 'opacity .22s ease, transform .22s ease',
            }}
          >
            <img
              src={dashboard.preview}
              alt={`Vista previa de ${dashboard.title}`}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'fill',
              }}
              onError={e => {
                e.currentTarget.style.display = 'none'

                const fallback =
                  e.currentTarget.nextElementSibling as HTMLElement | null

                if (fallback) fallback.style.display = 'flex'
              }}
            />

            {/* Fallback si la imagen no existe */}
            <div
              style={{
                display: 'none',
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '8px',
                color: C.textSoft,
                background: C.white,
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
              }}
            >
              <IconPowerBI size={30} />
              <span>
                No se encontró la vista previa en{' '}
                <strong>public/powerbi</strong>
              </span>
            </div>
          </div>

          {/* 
            Fila del archivo.
            SIN tarjeta gruesa.
            SIN icono.
            SIN "ARCHIVO POWER BI".
            Solo nombre formal + tres puntos.
          */}
          <div
            style={{
              width: '100%',
              height: '34px',
              flex: '0 0 34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxSizing: 'border-box',
              padding: '0 2px',
              marginTop: '5px',
              opacity: transitioning ? 0 : 1,
              transition: 'opacity .22s ease',
            }}
          >
            <div
              title={dashboard.fileName}
              style={{
                minWidth: 0,
                flex: '1 1 auto',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                color: C.navy,
                lineHeight: 1.2,
              }}
            >
              {dashboard.fileName}
            </div>

            <a
              href={dashboard.file}
              download={dashboard.fileName}
              aria-label={`Descargar ${dashboard.fileName}`}
              title="Descargar PBIX"
              style={{
                flex: '0 0 28px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.navyMid,
                textDecoration: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = C.blue3
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <IconMore color={C.navyMid} />
            </a>
          </div>

          {/* Indicadores debajo del archivo */}
          <div
            style={{
              height: '8px',
              flex: '0 0 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            {DASHBOARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? 1 : -1)}
                aria-label={`Ir al dashboard ${i + 1}`}
                style={{
                  width: i === current ? '18px' : '5px',
                  height: '5px',
                  padding: 0,
                  border: 'none',
                  borderRadius: '5px',
                  background: i === current ? C.navy : C.border,
                  cursor: 'pointer',
                  transition: 'all .22s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Flecha derecha */}
        <button
          onClick={next}
          aria-label="Dashboard siguiente"
          style={{
            position: 'absolute',
            top: '50%',
            right: '2px',
            left: 'auto',
            transform: 'translateY(-50%)',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: `1px solid ${C.border}`,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.96)',
            color: C.navyMid,
            fontFamily: 'Inter, sans-serif',
            fontSize: '24px',
            fontWeight: 400,
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(13,43,94,.10)',
            zIndex: 5,
          }}
        >
          ›
        </button>
      </div>

      {/* Botón inferior. No ocupa espacio del dashboard. */}
      <div
        style={{
          flex: '0 0 34px',
          height: '34px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={onVerCartera}
          style={{
            background: C.blue1,
            border: 'none',
            borderRadius: '7px',
            color: '#fff',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
            fontSize: '12px',
            padding: '8px 18px',
            cursor: 'pointer',
            letterSpacing: '.02em',
            whiteSpace: 'nowrap',
          }}
        >
          Ver Cartera Clientes →
        </button>
      </div>
    </div>
  )
}

// ── Vista 2: Lista de Clientes con Filtros, Saldo y Ordenamiento ────────────
type SortField = 'dni' | 'nombre' | 'ifi' | 'vencimiento' | 'saldo'
type SortOrder = 'asc' | 'desc'

function View2({ clients, loading, onSelect, onBack }: {
  clients: any[];
  loading: boolean;
  onSelect: (c: any) => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState('')
  const [selectedIFI, setSelectedIFI] = useState('ALL')
  const [selectedVenc, setSelectedVenc] = useState('ALL')
  const [sortField, setSortField] = useState<SortField>('nombre')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Opciones únicas para el filtro de IFI
  const ifiOptions = useMemo(() => {
    const set = new Set<string>()
    clients.forEach(c => {
      const val = getValue(c, 'IFI', 'ifi')
      if (val && val !== '---') set.add(val)
    })
    return Array.from(set).sort()
  }, [clients])

  // Opciones únicas para el filtro de Tipo Vencimiento
  const vencOptions = useMemo(() => {
    const set = new Set<string>()
    clients.forEach(c => {
      const val = getValue(c, 'TIPO DE VENCIMIENTO', 'TIPO_VENCIMIENTO', 'vencimiento')
      if (val && val !== '---') set.add(val)
    })
    return Array.from(set).sort()
  }, [clients])

  // Filtrado y Ordenamiento
  const processedClients = useMemo(() => {
    return clients
      .filter(c => {
        const search = q.toLowerCase()
        const dni = formatDNI(getValue(c, 'DNI', 'dni', 'Dni'))
        const nombre = getValue(c, 'NOMBRE', 'nombre', 'CLIENTE', 'cliente', 'TITULAR').toLowerCase()
        const ifi = getValue(c, 'IFI', 'ifi')
        const venc = getValue(c, 'TIPO DE VENCIMIENTO', 'TIPO_VENCIMIENTO', 'vencimiento')

        const matchesSearch = dni.includes(search) || nombre.includes(search)
        const matchesIFI = selectedIFI === 'ALL' || ifi === selectedIFI
        const matchesVenc = selectedVenc === 'ALL' || venc === selectedVenc

        return matchesSearch && matchesIFI && matchesVenc
      })
      .sort((a, b) => {
        if (sortField === 'saldo') {
          const numA = parseSaldo(getValue(a, 'SALDO', 'saldo')).num
          const numB = parseSaldo(getValue(b, 'SALDO', 'saldo')).num
          return sortOrder === 'asc' ? numA - numB : numB - numA
        }

        let valA = ''
        let valB = ''

        if (sortField === 'dni') {
          valA = formatDNI(getValue(a, 'DNI', 'dni'))
          valB = formatDNI(getValue(b, 'DNI', 'dni'))
        } else if (sortField === 'nombre') {
          valA = getValue(a, 'NOMBRE', 'nombre', 'CLIENTE')
          valB = getValue(b, 'NOMBRE', 'nombre', 'CLIENTE')
        } else if (sortField === 'ifi') {
          valA = getValue(a, 'IFI', 'ifi')
          valB = getValue(b, 'IFI', 'ifi')
        } else if (sortField === 'vencimiento') {
          valA = getValue(a, 'TIPO DE VENCIMIENTO', 'TIPO_VENCIMIENTO')
          valB = getValue(b, 'TIPO DE VENCIMIENTO', 'TIPO_VENCIMIENTO')
        }

        const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        return sortOrder === 'asc' ? cmp : -cmp
      })
  }, [clients, q, selectedIFI, selectedVenc, sortField, sortOrder])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 32px', gap: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} style={{
          background: C.white, border: `1px solid ${C.border}`, borderRadius: '6px',
          padding: '6px 14px', color: C.textMid, fontSize: '13px', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', boxShadow: '0 1px 3px rgba(13,43,94,0.07)',
        }}>← Volver</button>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: C.navy, margin: 0 }}>
          Cartera de Clientes
        </h2>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: C.textSoft,
          background: C.white, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${C.border}`,
        }}>
          {loading ? 'Cargando...' : `${processedClients.length.toLocaleString()} registros`}
        </span>
      </div>

      {/* Controles y Filtros */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
        background: C.white, padding: '12px 16px', borderRadius: '8px',
        border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(13,43,94,0.04)',
      }}>
        {/* Buscador */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <IconSearch />
          </div>
          <input
            type="text" placeholder="Buscar por DNI o Nombre..." value={q}
            onChange={e => setQ(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px',
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: '6px', color: C.text,
              fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none',
            }}
          />
        </div>

        {/* Filtro IFI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: C.textSoft, textTransform: 'uppercase' }}>
            IFI:
          </label>
          <select
            value={selectedIFI}
            onChange={e => setSelectedIFI(e.target.value)}
            style={{
              padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: '6px', color: C.textMid, fontFamily: 'Inter, sans-serif', fontSize: '12px', outline: 'none',
            }}
          >
            <option value="ALL">Todas</option>
            {ifiOptions.map(ifi => (
              <option key={ifi} value={ifi}>{ifi}</option>
            ))}
          </select>
        </div>

        {/* Filtro Vencimiento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: C.textSoft, textTransform: 'uppercase' }}>
            Vencimiento:
          </label>
          <select
            value={selectedVenc}
            onChange={e => setSelectedVenc(e.target.value)}
            style={{
              padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: '6px', color: C.textMid, fontFamily: 'Inter, sans-serif', fontSize: '12px', outline: 'none',
            }}
          >
            <option value="ALL">Todos</option>
            {vencOptions.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Limpiar filtros */}
        {(selectedIFI !== 'ALL' || selectedVenc !== 'ALL' || q !== '') && (
          <button
            onClick={() => { setSelectedIFI('ALL'); setSelectedVenc('ALL'); setQ('') }}
            style={{
              background: 'transparent', border: 'none', color: C.s5,
              fontFamily: 'Inter, sans-serif', fontSize: '12px', cursor: 'pointer',
              textDecoration: 'underline', padding: '4px 8px',
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Encabezados Ordenables de Tabla */}
      <div style={{
        display: 'grid', gridTemplateColumns: '100px 1.8fr 140px 150px 130px', gap: '0 12px',
        padding: '10px 16px', background: C.navy, borderRadius: '6px 6px 0 0',
      }}>
        <button onClick={() => toggleSort('dni')} style={thBtnStyle}>
          DNI {renderSortArrow('dni')}
        </button>
        <button onClick={() => toggleSort('nombre')} style={thBtnStyle}>
          Cliente {renderSortArrow('nombre')}
        </button>
        <button onClick={() => toggleSort('ifi')} style={thBtnStyle}>
          IFI {renderSortArrow('ifi')}
        </button>
        <button onClick={() => toggleSort('vencimiento')} style={thBtnStyle}>
          Tipo Vencimiento {renderSortArrow('vencimiento')}
        </button>
        <button onClick={() => toggleSort('saldo')} style={thBtnStyle}>
          Saldo {renderSortArrow('saldo')}
        </button>
      </div>

      {/* Filas de la Tabla */}
      <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: '0 0 8px 8px', background: C.white, boxShadow: '0 2px 10px rgba(13,43,94,0.06)' }}>
        {loading && clients.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: C.textSoft, fontFamily: 'Inter, sans-serif' }}>
            Cargando registros desde Supabase...
          </div>
        ) : processedClients.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: C.textSoft, fontFamily: 'Inter, sans-serif' }}>
            No se encontraron clientes con los filtros seleccionados.
          </div>
        ) : (
          processedClients.map((client, idx) => {
            const { num: saldoNum, formatted: saldoFormatted } = parseSaldo(getValue(client, 'SALDO', 'saldo'))
            const isZero = saldoNum === 0

            return (
              <button key={client.id || idx} onClick={() => onSelect(client)} style={{
                width: '100%', display: 'grid', gridTemplateColumns: '100px 1.8fr 140px 150px 130px', gap: '0 12px',
                padding: '11px 16px', background: 'transparent', border: 'none',
                borderBottom: `1px solid ${C.surface}`, cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.13s', alignItems: 'center',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* DNI */}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: C.textSoft }}>
                  {formatDNI(getValue(client, 'DNI', 'dni', 'Dni'))}
                </span>

                {/* Nombre Completo en 1 línea sin recortar */}
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '13px', color: C.textMid, fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }} title={getValue(client, 'NOMBRE', 'nombre', 'CLIENTE', 'cliente', 'TITULAR')}>
                  {getValue(client, 'NOMBRE', 'nombre', 'CLIENTE', 'cliente', 'TITULAR')}
                </span>

                {/* IFI */}
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '12px', color: C.textMid,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {getValue(client, 'IFI', 'ifi')}
                </span>

                {/* Tipo de Vencimiento */}
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: C.navyLight,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {getValue(client, 'TIPO DE VENCIMIENTO', 'TIPO_VENCIMIENTO', 'vencimiento')}
                </span>

                {/* Burbuja de Saldo (Gris si es 0, Roja si hay dinero) */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '3px 10px', borderRadius: '14px',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600,
                    background: isZero ? '#e2e8f0' : '#fee2e2',
                    color: isZero ? '#475569' : '#dc2626',
                    border: `1px solid ${isZero ? '#cbd5e1' : '#fca5a5'}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {saldoFormatted}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

const thBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, margin: 0,
  fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
  color: 'rgba(255,255,255,0.85)', letterSpacing: '0.12em',
  textTransform: 'uppercase', textAlign: 'left', cursor: 'pointer',
  display: 'flex', alignItems: 'center',
}

// ── Modal de Contraseña (desbloquear edición) ───────────────────────────────
function PasswordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const EDIT_PASSWORD = import.meta.env.VITE_EDIT_PASSWORD || ''

  const attempt = () => {
    if (EDIT_PASSWORD !== '' && value === EDIT_PASSWORD) {
      onSuccess()
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(13,43,94,0.45)', zIndex: 200, backdropFilter: 'blur(3px)' }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 201,
          width: 'min(340px, 90vw)', background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: '14px', boxShadow: '0 20px 60px rgba(13,43,94,0.22)', padding: '22px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: C.navy, marginBottom: '4px' }}>
          Desbloquear edición
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: C.textSoft, marginBottom: '14px' }}>
          Ingresa la contraseña para poder editar los registros.
        </div>

        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={e => { setValue(e.target.value); setError(false) }}
          onKeyDown={e => { if (e.key === 'Enter') attempt() }}
          placeholder="Contraseña"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '9px 12px',
            background: C.white, border: `1px solid ${error ? C.s5 : C.celeste}`,
            borderRadius: '6px', color: C.text, fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none',
          }}
        />

        {error && (
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: C.s5, marginTop: '6px' }}>
            Contraseña incorrecta. Intenta de nuevo.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
          <Btn color={C.textMid} border={C.border} bg={C.white} onClick={onClose}>Cancelar</Btn>
          <Btn color="#fff" border={C.blue1} bg={C.blue1} onClick={attempt}>Ingresar</Btn>
        </div>
      </div>
    </>
  )
}

// ── Componente Colapsable ───────────────────────────────────────────────────
function Section({ title, accent, children, defaultOpen = false }: {
  title: string; accent: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: '9px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(13,43,94,0.05)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px', background: C.white, border: 'none', cursor: 'pointer',
        borderLeft: `5px solid ${accent}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
            background: `${accent}18`, color: accent,
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px',
            letterSpacing: '0.02em',
          }}>
            {title}
          </span>
        </div>
        <IconChevron open={open} color={C.textSoft} />
      </button>
      {open && (
        <div style={{ padding: '16px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Campo de Información ─────────────────────────────────────────────────────
function Field({ label, value, isEdit = false, singleLine = false, onChange }: {
  label: string; value: string; isEdit?: boolean; singleLine?: boolean; onChange?: (value: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
        letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textSoft,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      {isEdit ? (
        <input
          value={value === '---' ? '' : value}
          onChange={e => onChange?.(e.target.value)}
          style={{
            background: C.white, border: `1px solid ${C.celeste}`,
            borderRadius: '5px', color: C.text, fontFamily: 'Inter, sans-serif',
            fontSize: '13px', padding: '6px 9px', outline: 'none', width: '100%',
          }}
        />
      ) : (
        <span
          title={value}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: '13px', color: C.textMid, fontWeight: 500,
            ...(singleLine ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {})
          }}
        >
          {value}
        </span>
      )}
    </div>
  )
}

function Grid({ cols = 3, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '14px 20px' }}>
      {children}
    </div>
  )
}

// ── Seguimiento: tabla editable con adjuntos, persistida en Supabase ────────
const SEGUIMIENTO_BUCKET = 'seguimiento-adjuntos'

type SeguimientoRow = {
  id: string
  client_id: string | number
  fecha_correo: string | null
  correo_archivo_nombre: string | null
  correo_archivo_url: string | null
  estado_respuesta: 'respondido' | 'no_respondido'
  fecha_respuesta: string | null
  respuesta_archivo_nombre: string | null
  respuesta_archivo_url: string | null
  created_at?: string
}

function IconPencilSmall({ size = 10, color = C.textSoft }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconTrash({ size = 13, color = C.s5 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

// Columnas: Fecha Correo | Correo Cliente | Estado | Fecha Respuesta | Respuesta | Eliminar
const seguimientoGridCols = '112px minmax(150px,1.5fr) 138px 112px 52px 32px'

function SeguimientoTableHead() {
  const headers = ['Fecha Correo', 'Correo Cliente', 'Estado de Respuesta', 'Fecha Respuesta', 'Respuesta', '']
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: seguimientoGridCols, gap: '0 10px',
      padding: '8px 12px', background: C.navy, borderRadius: '6px 6px 0 0',
    }}>
      {headers.map((h, i) => (
        <span key={i} style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {h}
        </span>
      ))}
    </div>
  )
}

const seguimientoDateStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '5px 6px',
  background: C.white, border: `1px solid ${C.border}`, borderRadius: '5px',
  fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: C.textMid, outline: 'none',
}

function AttachmentField({
  fileName,
  fileUrl,
  disabled,
  canEdit,
  color,
  showName,
  onUpload,
}: {
  fileName: string | null
  fileUrl: string | null
  disabled: boolean
  canEdit: boolean
  color: string
  showName: boolean
  onUpload: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const canUpload = canEdit && !disabled

  const handleIconClick = () => {
    if (disabled) return
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
    } else if (canUpload) {
      inputRef.current?.click()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={handleIconClick}
          disabled={disabled}
          title={fileUrl ? (fileName || 'Ver adjunto') : canUpload ? 'Adjuntar documento' : 'Sin adjunto'}
          style={{
            background: 'none', border: 'none', padding: 0, margin: 0,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.35 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconMail size={16} color={fileUrl ? color : C.textSoft} />
        </button>

        {canUpload && fileUrl && (
          <button
            onClick={() => inputRef.current?.click()}
            title="Reemplazar adjunto"
            style={{
              background: C.white, border: `1px solid ${C.border}`, borderRadius: '4px',
              width: '16px', height: '16px', padding: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <IconPencilSmall />
          </button>
        )}

        {canUpload && (
          <input
            ref={inputRef}
            type="file"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
            style={{ display: 'none' }}
          />
        )}
      </div>

      {showName && (
        <span
          title={fileName || ''}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: '10px', color: C.textSoft,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
          }}
        >
          {fileName || (canUpload ? 'Sin adjuntar' : '—')}
        </span>
      )}
    </div>
  )
}

function SeguimientoRowView({
  row,
  canEdit,
  highlight = false,
  onChange,
  onDelete,
}: {
  row: SeguimientoRow
  canEdit: boolean
  highlight?: boolean
  onChange: (id: string, patch: Partial<SeguimientoRow>) => void
  onDelete: (id: string) => void
}) {
  const isRespondido = row.estado_respuesta === 'respondido'

  const uploadFile = async (file: File, field: 'correo' | 'respuesta') => {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${row.client_id}/${row.id}/${field}-${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from(SEGUIMIENTO_BUCKET).upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(SEGUIMIENTO_BUCKET).getPublicUrl(path)
      onChange(row.id, field === 'correo'
        ? { correo_archivo_nombre: file.name, correo_archivo_url: data.publicUrl }
        : { respuesta_archivo_nombre: file.name, respuesta_archivo_url: data.publicUrl })
    } catch (err: any) {
      alert(`No se pudo subir el archivo.\n\n${err?.message || 'Error desconocido'}`)
    }
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: seguimientoGridCols, gap: '0 10px', alignItems: 'center',
      padding: '9px 12px', background: highlight ? `${C.s6}0d` : C.white, borderBottom: `1px solid ${C.surface}`,
    }}>
      <input
        type="date"
        value={row.fecha_correo || ''}
        disabled={!canEdit}
        onChange={e => onChange(row.id, { fecha_correo: e.target.value || null })}
        style={{ ...seguimientoDateStyle, opacity: canEdit ? 1 : 0.75 }}
      />

      <AttachmentField
        fileName={row.correo_archivo_nombre}
        fileUrl={row.correo_archivo_url}
        disabled={false}
        canEdit={canEdit}
        color={C.celeste}
        showName
        onUpload={f => uploadFile(f, 'correo')}
      />

      <select
        value={row.estado_respuesta}
        disabled={!canEdit}
        onChange={e => onChange(row.id, { estado_respuesta: e.target.value as SeguimientoRow['estado_respuesta'] })}
        style={{
          padding: '4px 8px', borderRadius: '20px', fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px', fontWeight: 600, cursor: canEdit ? 'pointer' : 'default', outline: 'none',
          background: isRespondido ? `${C.s1}18` : `${C.s5}18`,
          color: isRespondido ? C.s1 : C.s5,
          border: `1px solid ${isRespondido ? C.s1 : C.s5}55`,
        }}
      >
        <option value="no_respondido">No respondido</option>
        <option value="respondido">Respondido</option>
      </select>

      <input
        type="date"
        value={row.fecha_respuesta || ''}
        disabled={!canEdit || !isRespondido}
        onChange={e => onChange(row.id, { fecha_respuesta: e.target.value || null })}
        style={{ ...seguimientoDateStyle, opacity: canEdit && isRespondido ? 1 : 0.45 }}
      />

      <AttachmentField
        fileName={row.respuesta_archivo_nombre}
        fileUrl={row.respuesta_archivo_url}
        disabled={!isRespondido}
        canEdit={canEdit}
        color={C.s6}
        showName={false}
        onUpload={f => uploadFile(f, 'respuesta')}
      />

      {/* Eliminar flujo — solo visible con edición desbloqueada */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {canEdit && (
          <button
            onClick={() => onDelete(row.id)}
            title="Eliminar este registro de seguimiento"
            style={{
              background: 'none', border: 'none', padding: '4px', margin: 0,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '4px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${C.s5}18` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconTrash />
          </button>
        )}
      </div>
    </div>
  )
}

function SeguimientoManager({ clientId, canEdit }: { clientId: string | number; canEdit: boolean }) {
  const [rows, setRows] = useState<SeguimientoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showHist, setShowHist] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('seguimientos')
        .select('*')
        .eq('client_id', clientId)
        .order('fecha_correo', { ascending: false })

      if (!cancelled) {
        if (error) {
          console.error('Error al cargar seguimiento:', error)
        } else {
          setRows(data || [])
        }
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [clientId])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = a.fecha_correo ? new Date(a.fecha_correo).getTime() : 0
      const db = b.fecha_correo ? new Date(b.fecha_correo).getTime() : 0
      return db - da
    })
  }, [rows])

  const latest = sorted[0]
  const rest = sorted.slice(1)

  const updateRow = async (id: string, patch: Partial<SeguimientoRow>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    const { error } = await supabase.from('seguimientos').update(patch).eq('id', id)
    if (error) {
      console.error('Error al guardar seguimiento:', error)
      alert(`No se pudo guardar el cambio.\n\n${error.message}`)
    }
  }

  const deleteRow = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro de seguimiento? Esta acción no se puede deshacer.')) return

    const { error } = await supabase.from('seguimientos').delete().eq('id', id)
    if (error) {
      console.error('Error al eliminar seguimiento:', error)
      alert(`No se pudo eliminar el registro.\n\n${error.message}`)
      return
    }

    setRows(prev => prev.filter(r => r.id !== id))
  }

  const handleCreate = async () => {
    if (creating) return
    try {
      setCreating(true)
      const { data, error } = await supabase
        .from('seguimientos')
        .insert({ client_id: clientId, estado_respuesta: 'no_respondido' })
        .select()
        .single()

      if (error) throw error
      setRows(prev => [data as SeguimientoRow, ...prev])
    } catch (err: any) {
      alert(`No se pudo crear el flujo de correo.\n\n${err?.message || 'Error desconocido'}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '12px',
          color: C.s6, letterSpacing: '0.02em',
        }}>
          Última Conversación con el Cliente
        </div>

        {canEdit && (
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              background: C.blue1, border: 'none', borderRadius: '6px', color: '#fff',
              fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '11px',
              padding: '6px 12px', cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? 'Creando...' : '+ Crear flujo de correo'}
          </button>
        )}
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(13,43,94,0.05)' }}>
        <SeguimientoTableHead />
        {loading ? (
          <div style={{ padding: '18px', textAlign: 'center', color: C.textSoft, fontFamily: 'Inter, sans-serif', fontSize: '12px', background: C.white }}>
            Cargando seguimiento...
          </div>
        ) : !latest ? (
          <div style={{ padding: '18px', textAlign: 'center', color: C.textSoft, fontFamily: 'Inter, sans-serif', fontSize: '12px', background: C.white }}>
            Sin registros de seguimiento todavía.
          </div>
        ) : (
          <SeguimientoRowView row={latest} canEdit={canEdit} onChange={updateRow} onDelete={deleteRow} highlight />
        )}
      </div>

      {rest.length > 0 && (
        <div>
          <button
            onClick={() => setShowHist(h => !h)}
            style={{
              background: C.white, border: `1px solid ${C.border}`, borderRadius: '6px',
              padding: '7px 14px', color: C.navyMid,
              fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px',
              boxShadow: '0 1px 3px rgba(13,43,94,0.07)',
            }}
          >
            <IconMail size={13} color={C.celeste} />
            Ver todo el historial de mensajes ({rest.length})
            <IconChevron open={showHist} color={C.textSoft} />
          </button>

          {showHist && (
            <div style={{ marginTop: '10px', border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
              <SeguimientoTableHead />
              {rest.map(r => (
                <SeguimientoRowView key={r.id} row={r} canEdit={canEdit} onChange={updateRow} onDelete={deleteRow} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Botón Personalizable ─────────────────────────────────────────────────────
function Btn({ color, border, bg, onClick, children }: {
  color: string; border: string; bg: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} style={{
      background: bg, border: `1px solid ${border}`, borderRadius: '6px',
      color: color, fontFamily: 'Outfit, sans-serif', fontWeight: 600,
      fontSize: '12px', padding: '6px 13px', cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  )
}

// ── Modal Detalle del Cliente ────────────────────────────────────────────────
function ClientModal({
  client,
  canEdit,
  onRequestUnlock,
  onClose,
  onSaved,
}: {
  client: any;
  canEdit: boolean;
  onRequestUnlock: () => void;
  onClose: () => void;
  onSaved: (updatedClient: any) => void;
}) {
  const [isEdit, setIsEdit] = useState(false)
  const [editData, setEditData] = useState<any>({ ...client })
  const [saving, setSaving] = useState(false)

  const dni = formatDNI(getValue(editData, 'DNI', 'dni', 'Dni'))
  const nombre = getValue(editData, 'NOMBRE', 'nombre', 'CLIENTE', 'cliente', 'TITULAR')
  const prestamo = formatPrestamo(getValue(editData, 'N° PRESTAMO', 'N° PRESTAMO ', 'PRESTAMO', 'n_prestamo', 'prestamo'))

  const updateField = (value: string, ...keys: string[]) => {
    const actualKey = getActualKey(editData, ...keys)

    if (!actualKey) {
      console.warn(`No se encontró la columna para: ${keys.join(', ')}`)
      return
    }

    setEditData((prev: any) => ({
      ...prev,
      [actualKey]: value,
    }))
  }

  const handleSave = async () => {
    if (saving) return

    try {
      setSaving(true)

      const editableFields = [
        ['DNI', 'dni', 'Dni'],
        ['NOMBRE', 'nombre', 'CLIENTE', 'cliente', 'TITULAR'],
        ['FALLECIDO', 'fallecido'],
        ['N° PRESTAMO', 'N° PRESTAMO ', 'PRESTAMO', 'n_prestamo', 'prestamo'],
        ['IFI', 'ifi'],
        ['DISTRIBUCIÓN', 'DISTRIBUCION', 'distribucion'],
        ['PRODUCTO', 'producto'],
        ['TIPO DE VENCIMIENTO', 'TIPO_VENCIMIENTO', 'vencimiento'],
        ['SALDO', 'saldo'],
        ['CONSTANCIA DE NO ADEUDO', 'CNA', 'cna'],
        ['F. ENTREGA CNA', 'FECHA_CNA', 'f_entrega_cna'],
        ['ESTADO CNA', 'ESTADO_CNA', 'estado_cna'],
        ['LEVANTAMIENTO DE HIPOTECA', 'LEV_HIPOTECA', 'lev_hip'],
        ['F. ENTREGA LEV. HIP.', 'F. ENTREGA LEV. HIP', 'FECHA_LEV_HIP', 'f_entrega_lev'],
        ['ESTADO LEV. HIP', 'ESTADO LEV. HIP.', 'ESTADO_LEV_HIP', 'estado_lev'],
        ['ESTADO INMUEBLE', 'ESTADO_INMUEBLE', 'inmueble'],
        ['EMAIL', 'email', 'CORREO', 'correo'],
        ['TELEFONO', 'TELÉFONO', 'telefono', 'CELULAR', 'celular'],
      ]

      const changes: Record<string, any> = {}

      for (const keys of editableFields) {
        const actualKey = getActualKey(client, ...keys)
        if (!actualKey) continue

        const originalValue = client[actualKey]
        const newValue = editData[actualKey]

        const originalNormalized = originalValue === null || originalValue === undefined ? '' : String(originalValue)
        const newNormalized = newValue === null || newValue === undefined ? '' : String(newValue)

        if (originalNormalized !== newNormalized) {
          changes[actualKey] = newValue === '' ? null : newValue
        }
      }

      if (Object.keys(changes).length === 0) {
        setIsEdit(false)
        return
      }

      const idKey = getActualKey(client, 'id', 'ID')
      const dniKey = getActualKey(client, 'DNI', 'dni', 'Dni')

      let query = supabase.from('clientes').update(changes)

      if (idKey && client[idKey] !== undefined && client[idKey] !== null) {
        query = query.eq(idKey, client[idKey])
      } else if (dniKey && client[dniKey] !== undefined && client[dniKey] !== null) {
        query = query.eq(dniKey, client[dniKey])
      } else {
        throw new Error('No se encontró un identificador único para actualizar este cliente.')
      }

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Error al guardar cliente:', error)
        alert(`No se pudo guardar el cambio.\n\n${error.message}`)
        return
      }

      if (!data) {
        throw new Error('Supabase no devolvió el registro actualizado.')
      }

      setEditData(data)
      onSaved(data)
      setIsEdit(false)
    } catch (error: any) {
      console.error('Error inesperado al guardar:', error)
      alert(`Ocurrió un error al guardar.\n\n${error?.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData({ ...client })
    setIsEdit(false)
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(13,43,94,0.45)',
        zIndex: 100, backdropFilter: 'blur(3px)',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', zIndex: 101,
        width: 'min(860px, 95vw)', maxHeight: '88vh', overflowY: 'auto',
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: '14px', boxShadow: '0 20px 60px rgba(13,43,94,0.22)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Cabecera del Modal */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: C.navy,
          position: 'sticky', top: 0, zIndex: 10,
          borderRadius: '14px 14px 0 0', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '7px', flexShrink: 0,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                {dni.slice(-2)}
              </span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                title={nombre}
                style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                {nombre}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>
                DNI #{dni}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {canEdit && isEdit && (
              <Btn color="#fff" border={C.s5} bg={C.s5} onClick={handleCancel}>Reestablecer</Btn>
            )}
            {canEdit ? (
              <Btn
                color="#fff"
                border={isEdit ? C.s2 : C.blue1}
                bg={isEdit ? C.s2 : C.blue1}
                onClick={() => {
                  if (isEdit) {
                    handleCancel()
                  } else {
                    setEditData({ ...client })
                    setIsEdit(true)
                  }
                }}
              >
                {isEdit ? 'Cancelar' : 'Editar'}
              </Btn>
            ) : (
              <Btn color={C.textSoft} border={C.border} bg={C.white} onClick={onRequestUnlock}>
                🔒 Editar
              </Btn>
            )}
            {canEdit && isEdit && (
              <Btn color="#fff" border={C.s1} bg={C.s1} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Btn>
            )}
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', padding: '5px', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido Modal */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* 1. Información del Cliente (Nombre completo en 1 línea con espacio amplio) */}
          <div style={{ border: `1px solid ${C.border}`, borderRadius: '9px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(13,43,94,0.05)', borderLeft: `5px solid ${C.s1}` }}>
            <div style={{ padding: '11px 16px', background: C.white, borderBottom: `1px solid ${C.border}` }}>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                background: `${C.s1}18`, color: C.s1,
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px',
              }}>
                1. Información del Cliente
              </span>
            </div>
            <div style={{ padding: '16px', background: C.bg }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: '14px 20px', alignItems: 'center' }}>
                <Field label="DNI" value={dni} isEdit={isEdit} singleLine onChange={value => updateField(value, 'DNI', 'dni', 'Dni')} />
                <Field label="Nombre" value={nombre} isEdit={isEdit} singleLine onChange={value => updateField(value, 'NOMBRE', 'nombre', 'CLIENTE', 'cliente', 'TITULAR')} />
                <Field label="Fallecido" value={getValue(editData, 'FALLECIDO', 'fallecido')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'FALLECIDO', 'fallecido')} />
              </div>
            </div>
          </div>

          {/* 2. Información del Crédito */}
          <Section title="2. Información del Crédito" accent={C.s2}>
            <Grid cols={3}>
              <Field label="N° Préstamo" value={prestamo} isEdit={isEdit} singleLine onChange={value => updateField(value, 'N° PRESTAMO', 'N° PRESTAMO ', 'PRESTAMO', 'n_prestamo', 'prestamo')} />
              <Field label="IFI" value={getValue(editData, 'IFI', 'ifi')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'IFI', 'ifi')} />
              <Field label="Distribución" value={getValue(editData, 'DISTRIBUCIÓN', 'DISTRIBUCION', 'distribucion')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'DISTRIBUCIÓN', 'DISTRIBUCION', 'distribucion')} />
              <Field label="Producto" value={getValue(editData, 'PRODUCTO', 'producto')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'PRODUCTO', 'producto')} />
              <Field label="Tipo de Vencimiento" value={getValue(editData, 'TIPO DE VENCIMIENTO', 'TIPO_VENCIMIENTO', 'vencimiento')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'TIPO DE VENCIMIENTO', 'TIPO_VENCIMIENTO', 'vencimiento')} />
              <Field label="Saldo" value={getValue(editData, 'SALDO', 'saldo')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'SALDO', 'saldo')} />
            </Grid>
          </Section>

          {/* 3. Constancia de No Adeudo */}
          <Section title="3. Constancia de No Adeudo" accent={C.s3}>
            <Grid cols={3}>
              <Field label="Constancia de No Adeudo" value={getValue(editData, 'CONSTANCIA DE NO ADEUDO', 'CNA', 'cna')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'CONSTANCIA DE NO ADEUDO', 'CNA', 'cna')} />
              <Field label="F. Entrega CNA" value={getValue(editData, 'F. ENTREGA CNA', 'FECHA_CNA', 'f_entrega_cna')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'F. ENTREGA CNA', 'FECHA_CNA', 'f_entrega_cna')} />
              <Field label="Estado CNA" value={getValue(editData, 'ESTADO CNA', 'ESTADO_CNA', 'estado_cna')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'ESTADO CNA', 'ESTADO_CNA', 'estado_cna')} />
            </Grid>
          </Section>

          {/* 4. Levantamiento de Hipoteca */}
          <Section title="4. Levantamiento de Hipoteca" accent={C.s4}>
            <Grid cols={2}>
              <Field label="Levantamiento de Hipoteca" value={getValue(editData, 'LEVANTAMIENTO DE HIPOTECA', 'LEV_HIPOTECA', 'lev_hip')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'LEVANTAMIENTO DE HIPOTECA', 'LEV_HIPOTECA', 'lev_hip')} />
              <Field label="F. Entrega Lev. Hip." value={getValue(editData, 'F. ENTREGA LEV. HIP.', 'F. ENTREGA LEV. HIP', 'FECHA_LEV_HIP', 'f_entrega_lev')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'F. ENTREGA LEV. HIP.', 'F. ENTREGA LEV. HIP', 'FECHA_LEV_HIP', 'f_entrega_lev')} />
              <Field label="Estado Lev. Hip." value={getValue(editData, 'ESTADO LEV. HIP', 'ESTADO LEV. HIP.', 'ESTADO_LEV_HIP', 'estado_lev')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'ESTADO LEV. HIP', 'ESTADO LEV. HIP.', 'ESTADO_LEV_HIP', 'estado_lev')} />
              <Field label="Estado Inmueble" value={getValue(editData, 'ESTADO INMUEBLE', 'ESTADO_INMUEBLE', 'inmueble')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'ESTADO INMUEBLE', 'ESTADO_INMUEBLE', 'inmueble')} />
            </Grid>
          </Section>

          {/* 5. Contacto */}
          <Section title="5. Contacto" accent={C.s5}>
            <Grid cols={2}>
              <Field label="Email" value={getValue(editData, 'EMAIL', 'email', 'CORREO', 'correo')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'EMAIL', 'email', 'CORREO', 'correo')} />
              <Field label="Teléfono" value={getValue(editData, 'TELEFONO', 'TELÉFONO', 'telefono', 'CELULAR', 'celular')} isEdit={isEdit} singleLine onChange={value => updateField(value, 'TELEFONO', 'TELÉFONO', 'telefono', 'CELULAR', 'celular')} />
            </Grid>
          </Section>

          {/* 6. Seguimiento */}
          <Section title="6. Seguimiento (2026)" accent={C.s6} defaultOpen>
            <SeguimientoManager clientId={client.id} canEdit={canEdit} />
          </Section>
        </div>
      </div>
    </>
  )
}

// ── App Principal ────────────────────────────────────────────────────────────
type View = 'dashboard' | 'cartera'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [selected, setSelected] = useState<any | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const handleLockClick = () => {
    if (isUnlocked) {
      setIsUnlocked(false)
    } else {
      setShowPasswordModal(true)
    }
  }

  // La vista de dashboards funciona como una pantalla completa:
  // no permite que el documento cree scroll vertical u horizontal.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    const previous = {
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      bodyHeight: body.style.height,
      bodyMargin: body.style.margin,
      bodyOverflow: body.style.overflow,
    }

    html.style.height = '100%'
    html.style.overflow = 'hidden'
    body.style.height = '100%'
    body.style.margin = '0'
    body.style.overflow = 'hidden'

    return () => {
      html.style.height = previous.htmlHeight
      html.style.overflow = previous.htmlOverflow
      body.style.height = previous.bodyHeight
      body.style.margin = previous.bodyMargin
      body.style.overflow = previous.bodyOverflow
    }
  }, [])

  useEffect(() => {
    async function fetchAllClients() {
      try {
        setLoading(true)
        let allClients: any[] = []
        let page = 0
        const pageSize = 1000
        let fetchMore = true

        while (fetchMore) {
          const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (error) {
            console.error('Error al traer clientes:', error)
            break
          }

          if (data && data.length > 0) {
            allClients = [...allClients, ...data]
            if (data.length < pageSize) {
              fetchMore = false
            } else {
              page++
            }
          } else {
            fetchMore = false
          }
        }

        setClients(allClients)
      } catch (err) {
        console.error('Error inesperado:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllClients()
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100dvh',
        minHeight: 0,
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Header
        onLogoClick={() => { setView('dashboard'); setSelected(null) }}
        isUnlocked={isUnlocked}
        onLockClick={handleLockClick}
      />
      <main
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {view === 'dashboard' && <View1 onVerCartera={() => setView('cartera')} />}
        {view === 'cartera' && (
          <View2
            clients={clients}
            loading={loading}
            onSelect={setSelected}
            onBack={() => setView('dashboard')}
          />
        )}
      </main>
      {selected && (
        <ClientModal
          client={selected}
          canEdit={isUnlocked}
          onRequestUnlock={() => setShowPasswordModal(true)}
          onClose={() => setSelected(null)}
          onSaved={(updatedClient) => {
            setClients(prev =>
              prev.map(client =>
                client.id === updatedClient.id ? updatedClient : client
              )
            )
            setSelected(updatedClient)
          }}
        />
      )}
      {showPasswordModal && (
        <PasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setIsUnlocked(true)
            setShowPasswordModal(false)
          }}
        />
      )}
    </div>
  )
}
