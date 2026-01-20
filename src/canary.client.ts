const renderMarkdownLite = (markdown: string) =>
	markdown
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/\*([^*]+)\*/g, '<em>$1</em>')
		.replace(/\n/g, '<br>')

export function setupCanaryTheme() {
	const scheduleWire = (wireTimer?: number) => {
		if (wireTimer) clearTimeout(wireTimer)
		wireTimer = setTimeout(wire, 50)
	}
	if (typeof window === 'undefined') return
    window.addEventListener('vitepress:codeGroupTabActivate', (e) => {
		const notationPopover = document.querySelectorAll('.canary-extract-notation-popover')
		notationPopover.forEach(np => {
			const nodeId = np.dataset.nodeId
			const target = document.getElementById(nodeId!);
			let languageParent = target;
			while(languageParent && !languageParent.className.includes('language-')) {
				languageParent = languageParent.parentElement;
			}
			if (languageParent) {
				if (languageParent.classList.contains('active')) {
					np.style.display = 'block'
					positionPopover(np, target as HTMLElement)
				} else {
					np.style.display = 'none'
				}
			}
		})
	  	scheduleWire()
	}, { passive: true })
    window.addEventListener('click', (e) => {
		const path = e.composedPath()
		if (path.some((el: any) => el?.classList?.contains?.('vp-code-group') || el?.classList?.contains?.('tabs'))) {
			scheduleWire()
		}
    }, { passive: true })
	
	const { popover, textContainer, docsContainer } = createPopover()
	const wiredNodes = new WeakSet<HTMLElement>()
	let scrollCleanup: (() => void) | null = null

	const hide = () => {
    if (popover.dataset.fromClick === 'true') return
		popover.dataset.visible = 'false'
		popover.style.display = 'none'
	}

	const show = (target: HTMLElement, fromClick: boolean = false) => {
		const payload = target.dataset.dartHoverCode
		if (!payload) return

		textContainer.innerHTML = renderMarkdownLite(decodeURIComponent(payload))
		const docsPayload = target.dataset.dartHoverDocs
		if (docsPayload) {
			docsContainer.innerHTML = renderMarkdownLite(decodeURIComponent(docsPayload))
			textContainer.appendChild(docsContainer)
			docsContainer.style.display = 'block'
		} else {
			docsContainer.style.display = 'none'
		}
		if (textContainer.clientWidth >= 600) {
			popover.style.maxWidth = '900px'
			textContainer.style.maxWidth = '900px'
		}
		popover.style.display = 'block'
		popover.dataset.visible = 'true'
    	popover.dataset.fromClick = fromClick ? 'true' : 'false'

		requestAnimationFrame(() => positionPopover(popover, target))
	}

	const wire = () => {
		const nodes = document.querySelectorAll('.dart-inspectable')
		// notationPopover.forEach(np => np.remove())
		nodes.forEach(node => {
			if (wiredNodes.has(node)) return
			wiredNodes.add(node)
			const notation = node.attributes['data-dart-notation']?.value
			if (notation) {
				if (notation === 'ExtractNotation') {
					const target = node as HTMLElement
					const payload = target.dataset.dartHoverCode
					if (!payload) return
					const docsPayload = target.dataset.dartHoverDocs
					node.id = `canary-extract-notation-popover-${Math.random().toString(16).slice(2)}`
					const {popover, textContainer, docsContainer} = createPopover()
					document.body.appendChild(popover)
					popover.className = 'canary-hover-popover shiki canary-extract-notation-popover'
					popover.dataset.nodeId = node.id
					textContainer.innerHTML = renderMarkdownLite(decodeURIComponent(payload))
					if (docsPayload) {
						docsContainer.innerHTML = renderMarkdownLite(decodeURIComponent(docsPayload))
						textContainer.appendChild(docsContainer)
						docsContainer.style.display = 'block'
					} else {
						docsContainer.style.display = 'none'
					}
					let languageParent = target;
					popover.dataset.visible = 'true'
					requestAnimationFrame(() => positionPopover(popover, target))
					while(languageParent && !languageParent.className.includes('language-')) {
						languageParent = languageParent.parentElement;
					}
					if (languageParent) {
						if (languageParent.classList.contains('active')) {
							popover.style.display = 'block'
						} else {
							popover.style.display = 'none'
						}
					}
				}
				return
			}
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
		document.body.appendChild(popover)
		if (!scrollCleanup) {
			const onScroll = () => hide()
			window.addEventListener('scroll', onScroll, true)
			scrollCleanup = () => window.removeEventListener('scroll', onScroll, true)
		}
	}
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

function createPopover(id?: string): {	popover: HTMLElement, textContainer: HTMLElement, docsContainer: HTMLElement} {
	const popover = document.createElement('div')
	popover.className = 'canary-hover-popover shiki'
	const arrowContaienr = document.createElement('div')
	arrowContaienr.className = 'canary-hover-popover-arrow-container'
	const innerArrow = document.createElement('div')
	innerArrow.className = 'canary-hover-popover-inner-arrow'
	arrowContaienr.appendChild(innerArrow)
	const outerArrow = document.createElement('div')
	outerArrow.className = 'canary-hover-popover-outer-arrow'
	arrowContaienr.appendChild(outerArrow)
	const textContainer = document.createElement('div')
	textContainer.className = 'canary-hover-popover-wrapper'
	const docsContainer = document.createElement('div')
	docsContainer.className = 'canary-hover-popover-docs'
	popover.appendChild(textContainer)
	popover.appendChild(arrowContaienr)
	return {popover, textContainer, docsContainer}
}
