// dsh-mobile-sidebar-drawer — Client half.
//
// Turns the host's sidebar column into an overlay drawer on narrow,
// touch-primary screens: the column leaves the grid flow, slides in over the
// conversation, dims the page behind a backdrop, and closes from the backdrop,
// Escape, or a navigation tap inside it.
//
// Ported from dsh-web-mobile's drawer (layout/base CSS rules, the header
// toggle, the backdrop + floating button task and the drawer-close listeners),
// reduced to the drawer feature alone: no swipe gestures, no phone chrome, no
// keyboard or menu compat.

window.__ModuleLoader__.load({
  id: 'dsh-mobile-sidebar-drawer',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace of this plugin's own strings. */
    const NS = 'dshMobileDrawer'

    /**
     * Host sidebar column, made absolute so it can slide over the content. The
     * stylesheet's media query is the mobile branch: narrow viewport AND
     * touch-primary pointer. Width alone cannot tell a phone from a desktop
     * window — split views and OS display scaling push a PC's CSS viewport
     * below 1024px too — so the pointer term keeps the drawer off every
     * mouse-driven window.
     */
    const FRAME_ATTR = 'data-mobile-drawer'

    const DICT = {
      en: {
        open: 'Open sidebar',
        backdrop: 'Close sidebar',
      },
      zh: {
        open: '打开侧边栏',
        backdrop: '关闭侧边栏',
      },
    }

    const CSS = `
/* ---------- mobile drawer (narrow viewport AND touch-primary pointer) ---------- */

@media (max-width: 1023px) and (pointer: coarse) {
  /* The drawer takes the sidebar column out of grid flow, so the remaining
     in-flow items (center, rightbar) land in tracks 1..2: give the center
     every pixel and keep the other two at zero. box-sizing MUST be
     border-box, otherwise the safe-area padding is added on top of the
     host's 100% height and the document itself becomes scrollable. */
  html [${FRAME_ATTR}="frame"] {
    box-sizing: border-box !important;
    position: relative !important;
    grid-template-columns: minmax(0, 1fr) 0 0 !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  }

  /* The sidebar column (first grid child) becomes the drawer.
     Closed: translateX(-110%) of its own width, which guarantees the whole
     drawer leaves the viewport (a bare -100% leaves a sliver on screen).
     Open: transform:none, NOT translateX(0) — an identity transform would
     still make the drawer the containing block for fixed-position
     descendants (the host's settings sheet portals into the sidebar DOM),
     and that sheet would then be clipped by the drawer instead of covering
     the viewport. z 1300 keeps it above the host stack (its native sidebar
     column sits at 1100) and above the backdrop in the overlay layer. */
  [${FRAME_ATTR}="frame"] > :first-child {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    width: min(88vw, 280px) !important;
    z-index: 1300 !important;
    transform: translateX(-110%);
    transition: transform .28s var(--ds-ease-in-out, ease-in-out);
    padding-top: env(safe-area-inset-top, 0px) !important;
    border-right: none !important;
    background: var(--dsw-specific-sidebar-fill, #f9fafb);
    /* Dropping pan-x lets horizontal pointer events reach the page instead of
       being claimed as a pan; vertical scrolling inside the drawer stays. */
    touch-action: pan-y pinch-zoom !important;
  }

  /* Closed slot at the host's own specificity: the host's narrow branch pins
     the column with an !important width/transform of its own, so the closed
     rule has to match it or the drawer would keep a visible rail. */
  [${FRAME_ATTR}="frame"][data-sidebar-collapsed] > :first-child {
    width: min(88vw, 280px) !important;
    transform: translateX(-110%) !important;
  }

  [${FRAME_ATTR}="frame"]:not([data-sidebar-collapsed]) > :first-child {
    transform: none !important;
  }

  /* The desktop column drag handle would sit on the drawer's edge and eat
     touches; it has no meaning on a phone. */
  [${FRAME_ATTR}="frame"] [data-side="sidebar"],
  [${FRAME_ATTR}="frame"] [data-side="details"] {
    display: none !important;
  }

  /* The floating button is the only control on a sidebar panel page, and it
     sits exactly where those pages put their own title: the host's plugin
     pages start their heading at the panel's 24px gutter, i.e. under the
     38px button at left 10. Give the heading the button's width plus a
     margin instead of moving the button, so every panel keeps its own
     layout and only the top-left corner steps aside.
     Clearance is relative (button right edge 48 + 8) minus the panel's own
     gutter, so it follows the viewport instead of pinning the 32px measured
     at 390px. Both selectors key on host class fragments and degrade to a
     no-op if a future host renames them. */
  [${FRAME_ATTR}="frame"] [class*="_pageHeading"] > h1 {
    margin-left: calc(56px - clamp(24px, 4vw, 48px)) !important;
  }
  /* Third-party panel headers that ship their own top block rather than the
     host's page-head markup (the statistics page). Same clearance, applied to
     the block so its title and its own controls both clear the button. */
  [${FRAME_ATTR}="frame"] [class*="bs-head"] {
    margin-left: calc(56px - clamp(24px, 4vw, 48px)) !important;
  }

  /* ---------- popover band above the open drawer ----------
     The host portals its menus to <body> as position:fixed with z-index 1100,
     while the drawer column carries 1300 and the backdrop 1250. A menu opened
     from inside the drawer therefore painted UNDER both — measured at 390px on
     the account avatar menu: menu rect [12,676,144,110] z1100, and
     elementFromPoint at its centre returned a drawer element, so none of its
     rows was reachable. The same held for a workspace row's ⋯ and a session
     row's ⋯, which is the reported symptom.
     The raise is gated on the open drawer: our backdrop makes that the only
     state in which a menu can be opened from inside the drawer, so the
     closed-drawer and desktop stacks keep the host's own ordering.
     1400 sits above the drawer column (1300) and below nothing else in the
     host: the highest host band is 1100, and our own surfaces top out at 1301. */
  body:has([${FRAME_ATTR}="frame"]:not([data-sidebar-collapsed])) [role="menu"] {
    z-index: 1400 !important;
  }
  /* Modal dialogs (workspace rename, and any future dialog of the same shape)
     portal to a direct body child that carries the stacking context:
     body > div { position:fixed; z-index:1000 } wrapping
     [role="dialog"][aria-modal="true"]. Raising the dialog itself is useless —
     it only sorts inside that root, so the root is what has to move. */
  body:has([${FRAME_ATTR}="frame"]:not([data-sidebar-collapsed]))
    > div:has(> [role="dialog"][aria-modal="true"]) {
    z-index: 1400 !important;
  }

  @media (prefers-reduced-motion: reduce) {
    [${FRAME_ATTR}="frame"] > :first-child {
      transition: none !important;
    }
    [${FRAME_ATTR}="backdrop"] {
      animation: none !important;
    }
  }
}

/* ---------- header toggle (rendered at every width, hidden off the mobile branch) ---------- */

[${FRAME_ATTR}="toggle"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[${FRAME_ATTR}="toggle"]:hover,
[${FRAME_ATTR}="toggle"]:active {
  background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, .06));
}
[${FRAME_ATTR}="toggle"]:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #4f6ef7);
  outline-offset: 1px;
}

/* Dimmed backdrop under the open drawer. It renders inside the shell overlay
   layer (z 20), which already sits above every column; the drawer column's
   own 1300 keeps it above this backdrop. */
[${FRAME_ATTR}="backdrop"] {
  position: absolute;
  inset: 0;
  z-index: 1250;
  background: rgba(0, 0, 0, .45);
  cursor: pointer;
  animation: dsh-mobile-drawer-fade .2s var(--ds-ease-in-out, ease-in-out);
  -webkit-tap-highlight-color: transparent;
}
@keyframes dsh-mobile-drawer-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Floating fallback button: the hero/blank phases and sidebar panels render
   no session header, so this is the only control that opens the drawer
   there. Top aligns with the session header's toggle row. */
[${FRAME_ATTR}="fab"] {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 10px;
  z-index: 21;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 50%;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, .18);
  -webkit-tap-highlight-color: transparent;
}
[${FRAME_ATTR}="fab"]:active {
  background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, .06));
}
[${FRAME_ATTR}="fab"]:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #4f6ef7);
  outline-offset: 2px;
}

/* ---------- desktop / non-touch: the drawer controls never appear ----------
   Exact complement of the mobile query as a comma list (NOT A or NOT B): any
   viewport >= 1024px, plus any narrow viewport whose primary pointer is a
   mouse or absent. The slot renders the toggle at every width, so without
   this block it would leak onto desktop headers. */
@media (min-width: 1024px), (pointer: fine), (pointer: none) {
  [${FRAME_ATTR}="toggle"],
  [${FRAME_ATTR}="fab"],
  [${FRAME_ATTR}="backdrop"] {
    display: none !important;
  }
}
`

    /** The AppFrame element: direct parent of the shell overlay layer. */
    function frameElement() {
      const overlay = document.querySelector('[data-shell-overlay]')
      return overlay === null ? null : overlay.parentElement
    }

    /**
     * Mobile branch: narrow viewport AND touch-primary pointer. Width alone
     * cannot tell a phone from a desktop window — split views and OS display
     * scaling push a PC's CSS viewport below 1024px too — so the pointer term
     * keeps the drawer off every mouse-driven window. The stylesheet uses the
     * same string, so CSS and the rendered overlay cannot disagree.
     */
    const MOBILE_QUERY = '(max-width: 1023px) and (pointer: coarse)'

    /**
     * Drawer state derived from the host frame, published to the overlay
     * component. The host owns the open/closed truth (`data-sidebar-collapsed`
     * on the frame); this store only mirrors it, marks the frame so the
     * stylesheet can target it, and reports whether a conversation header is
     * on screen (the floating button replaces the header toggle otherwise).
     *
     * `mobile` gates what is RENDERED, not just what is painted: the backdrop
     * and the floating button must not exist as DOM on a desktop window, where
     * a stray full-frame node would still sit in the hit-test path of the
     * overlay layer even with `display: none` competing against a host rule.
     */
    function createFrameStore() {
      let snapshot = { frame: false, open: false, active: false, mobile: false }
      const listeners = new Set()
      let observer = null
      let raf = 0
      let stopped = false
      const media = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null

      const read = () => {
        const frame = frameElement()
        if (frame !== null && !frame.hasAttribute(FRAME_ATTR)) frame.setAttribute(FRAME_ATTR, 'frame')
        return {
          frame: frame !== null,
          open: frame !== null && !frame.hasAttribute('data-sidebar-collapsed'),
          active: document.querySelector('[data-phase="active"]') !== null,
          mobile: media !== null && media.matches,
        }
      }

      const publish = () => {
        const next = read()
        if (next.frame === snapshot.frame && next.open === snapshot.open &&
          next.active === snapshot.active && next.mobile === snapshot.mobile) return
        snapshot = next
        for (const listener of [...listeners]) {
          try {
            listener()
          } catch (error) {
            console.error('[dsh-mobile-sidebar-drawer] store listener failed', error)
          }
        }
      }

      const schedule = () => {
        if (raf !== 0 || stopped) return
        raf = requestAnimationFrame(() => {
          raf = 0
          if (!stopped) publish()
        })
      }

      return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        start() {
          stopped = false
          publish()
          media?.addEventListener('change', publish)
          observer = new MutationObserver((records) => {
            // Streaming output and history rendering cannot change shell
            // geometry, so their mutation bursts never wake this store.
            for (const record of records) {
              const node = record.target instanceof Element
                ? record.target
                : record.target.parentElement instanceof Element ? record.target.parentElement : null
              if (node !== null && node.closest('[data-chat-flow]') !== null) continue
              schedule()
              return
            }
          })
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-sidebar-collapsed', 'data-phase'],
            childList: true,
            subtree: true,
          })
          return () => {
            stopped = true
            media?.removeEventListener('change', publish)
            observer?.disconnect()
            observer = null
            if (raf !== 0) cancelAnimationFrame(raf)
            raf = 0
            const frame = frameElement()
            if (frame !== null) frame.removeAttribute(FRAME_ATTR)
          }
        },
      }
    }

    function useStore(store) {
      const [state, setState] = React.useState(store.getSnapshot())
      React.useEffect(() => store.subscribe(() => setState(store.getSnapshot())), [store])
      return state
    }

    /** Panel-left glyph: a frame with a vertical split. */
    function IconPanelLeft({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          fill: 'none',
          'aria-hidden': 'true',
        },
        h('rect', {
          x: 1.75,
          y: 2.75,
          width: 12.5,
          height: 10.5,
          rx: 2,
          stroke: 'currentColor',
          strokeWidth: 1.3,
        }),
        h('path', { d: 'M6.25 2.75v10.5', stroke: 'currentColor', strokeWidth: 1.3 }),
      )
    }

    /** Session-header action: opens the drawer on the mobile branch. */
    function DrawerToggle({ store, toggleSidebar, t }) {
      const state = useStore(store)
      const label = t('open')
      // Nothing to render off the mobile branch: the slot mounts this at every
      // width, and an absent node cannot be re-shown by a later host rule.
      if (!state.mobile) return null
      return h(
        'button',
        {
          type: 'button',
          [FRAME_ATTR]: 'toggle',
          'aria-label': label,
          title: label,
          onClick: () => toggleSidebar(),
        },
        h(IconPanelLeft, { size: 16 }),
      )
    }

    /**
     * Shell overlay: the dimmed backdrop while the drawer is open, plus the
     * floating open button wherever no session header exists (hero and blank
     * phases, and sidebar panels, which replace the conversation).
     */
    function DrawerOverlay({ store, toggleSidebar, t }) {
      const state = useStore(store)
      if (!state.mobile) return null
      const label = t('open')
      if (state.open) {
        return h('div', {
          [FRAME_ATTR]: 'backdrop',
          role: 'button',
          'aria-label': t('backdrop'),
          onClick: () => toggleSidebar(),
        })
      }
      if (state.active) return null
      return h(
        'button',
        {
          type: 'button',
          [FRAME_ATTR]: 'fab',
          'aria-label': label,
          title: label,
          onClick: () => toggleSidebar(),
        },
        h(IconPanelLeft, { size: 18 }),
      )
    }

    /**
     * Navigation targets inside the drawer that should hand the screen back to
     * what they opened. Session-row action buttons (the ⋯ menu) are excluded:
     * that menu must survive the tap.
     */
    const NAV_SELECTOR = [
      '[class*="sessionRow"]',
      '[class*="newSession"]',
      '[class*="panelRow"]',
      '[class*="searchResultRow"]',
      '[class*="searchResultWorkspace"]',
    ].join(', ')

    return {
      inject: ['slots', 'layout', 'locale'],

      apply(ctx) {
        const toggleSidebar = () => ctx.layout.toggleSidebar()
        const store = createFrameStore()

        ctx.effect(() => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }), 'dsh-mobile-sidebar-drawer: dictionaries')

        // One stylesheet, kept last in <head> so its overrides win over the
        // host's own (some host rules are !important too). A stale tag from a
        // previous load of this plugin is removed first: the reload is in
        // place, so an older copy would otherwise keep painting.
        ctx.effect(() => {
          const selector = 'style[data-plugin-css="dsh-mobile-sidebar-drawer/drawer.css"]'
          for (const stale of document.querySelectorAll(selector)) stale.remove()
          const tag = document.createElement('style')
          tag.dataset.plugin = 'dsh-mobile-sidebar-drawer'
          tag.dataset.pluginCss = 'dsh-mobile-sidebar-drawer/drawer.css'
          tag.textContent = CSS
          document.head.appendChild(tag)
          const bump = window.setTimeout(() => {
            if (tag.isConnected) document.head.appendChild(tag)
          }, 0)
          return () => {
            window.clearTimeout(bump)
            tag.remove()
          }
        }, 'dsh-mobile-sidebar-drawer: styles')

        ctx.effect(() => store.start(), 'dsh-mobile-sidebar-drawer: frame state')

        // Escape and navigation taps. The host owns the open state, so every
        // closer goes through the same toggle action.
        //
        // Every closer is gated on the mobile branch. The drawer only exists
        // there: on a wide screen the host's sidebar column is an ordinary
        // always-expanded column, and `data-sidebar-collapsed` merely reports
        // its open state, so an ungated closer would collapse the desktop
        // sidebar the moment a session or panel row was clicked.
        ctx.effect(() => {
          const mobileQuery = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null
          const drawerOpen = () => {
            if (mobileQuery === null || !mobileQuery.matches) return false
            const frame = frameElement()
            return frame !== null && !frame.hasAttribute('data-sidebar-collapsed')
          }
          const drawerColumn = () => {
            const frame = frameElement()
            return frame === null ? null : frame.firstElementChild
          }
          const onKeyDown = (event) => {
            if (event.key !== 'Escape') return
            // An open modal owns Escape; the drawer must not close under it.
            if (document.querySelector('[aria-modal="true"]') !== null) return
            if (drawerOpen()) toggleSidebar()
          }
          const onClick = (event) => {
            if (!drawerOpen()) return
            const target = event.target
            if (!(target instanceof Element)) return
            const column = drawerColumn()
            if (column === null || !column.contains(target)) return
            if (target.closest(NAV_SELECTOR) === null) return
            if (target.closest('[class*="sessionRow"] button') !== null) return
            // Let the tap's own handler navigate first: closing at pointerdown
            // would retract the drawer before the browser dispatches the click,
            // and the target's onClick would never run.
            window.setTimeout(() => {
              if (drawerOpen()) toggleSidebar()
            }, 0)
          }
          document.addEventListener('keydown', onKeyDown, true)
          document.addEventListener('click', onClick)
          return () => {
            document.removeEventListener('keydown', onKeyDown, true)
            document.removeEventListener('click', onClick)
          }
        }, 'dsh-mobile-sidebar-drawer: drawer close (Escape + navigate)')

        ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
          name: 'conversation.session.header.actions',
          id: 'mobile-drawer-toggle',
          order: -100,
          locale: NS,
          inject: () => ({ store, toggleSidebar }),
        }, DrawerToggle))

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'mobile-drawer-overlay',
          order: 1000,
          locale: NS,
          inject: () => ({ store, toggleSidebar }),
        }, DrawerOverlay))
      },
    }
  },
})
