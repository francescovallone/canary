import type { EnhanceAppContext } from 'vitepress';

const renderMarkdownLite = (markdown: string) =>
	markdown
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/\*([^*]+)\*/g, '<em>$1</em>')
		.replace(/\n/g, '<br>')

export function setupCanaryTheme(ctx: EnhanceAppContext) {
	if (typeof window === 'undefined') return

	const popover = document.createElement('div')
	popover.className = 'canary-hover-popover'
	document.body.appendChild(popover)

	const wiredNodes = new WeakSet<HTMLElement>()
	let scrollCleanup: (() => void) | null = null

	const hide = () => {
    if (popover.dataset.fromClick === 'true') return
		popover.dataset.visible = 'false'
		popover.style.display = 'none'
	}

	const show = (target: HTMLElement, fromClick: boolean = false) => {
		const payload = target.dataset.dartHover
		if (!payload) return

		popover.innerHTML = renderMarkdownLite(decodeURIComponent(payload))
		popover.style.display = 'block'
		popover.dataset.visible = 'true'
    popover.dataset.fromClick = fromClick ? 'true' : 'false'

		requestAnimationFrame(() => positionPopover(popover, target))
	}

	const wire = () => {
		const nodes = document.querySelectorAll<HTMLElement>('[data-dart-hover]')

		nodes.forEach(node => {
			if (wiredNodes.has(node)) return
			wiredNodes.add(node)

			node.addEventListener('mouseenter', () => show(node))
      node.addEventListener('click', () => {
        if (popover.dataset.fromClick === 'true') {
          popover.dataset.fromClick = 'false'
          if (popover.dataset.visible === 'true') {
            hide()
          } else {
            show(node, true)
          }
        } else {
          show(node, true)
        }
      })
			node.addEventListener('mouseleave', hide)
			node.addEventListener('focus', () => show(node))
			node.addEventListener('blur', hide)
		})

		if (!scrollCleanup) {
			const onScroll = () => hide()
			window.addEventListener('scroll', onScroll, true)
			scrollCleanup = () => window.removeEventListener('scroll', onScroll, true)
		}
	}

	let wireTimer: ReturnType<typeof setTimeout> | null = null
	const scheduleWire = () => {
		if (wireTimer) clearTimeout(wireTimer)
		wireTimer = setTimeout(wire, 50)
	}

	ctx.router.onAfterRouteChange?.(() => scheduleWire())
	ctx.router.onAfterRouteChanged?.(() => scheduleWire())

	// Watch for DOM updates (hydration / client nav) that add code blocks
	const observer = new MutationObserver(mutations => {
		// Ignore mutations caused by the popover itself
		const dominated = mutations.some(m => popover.contains(m.target as Node))
		if (dominated) return
		scheduleWire()
	})
	observer.observe(document.body, { childList: true, subtree: true })

	scheduleWire()
}

function positionPopover(popover: HTMLElement, target: HTMLElement) {
	const rect = target.getBoundingClientRect()
	const padding = 8

	const top = rect.bottom + window.scrollY + padding
	const left = rect.left + window.scrollX + rect.width / 2 - popover.offsetWidth / 2

	popover.style.top = `${Math.max(0, top)}px`
	popover.style.left = `${Math.max(padding, left)}px`
}
