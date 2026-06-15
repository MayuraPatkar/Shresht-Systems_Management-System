(() => {
    // DOM Elements
    const mainEl = document.querySelector('main') as HTMLElement | null;
    const scrollTopBtn = document.getElementById('floating-nav-scroll-top') as HTMLButtonElement | null;
    const progressText = document.getElementById('nav-progress-text') as HTMLElement | null;

    if (!mainEl) {
        console.error('Main scroll container not found');
        return;
    }

    // Nav items and sections mapping
    const navItems = document.querySelectorAll('.nav-item') as NodeListOf<HTMLAnchorElement>;
    const sectionIds = Array.from(navItems).map(item => item.getAttribute('href') || '');

    // Smooth scroll & Highlight flash
    navItems.forEach(item => {
        item.addEventListener('click', (e: Event) => {
            e.preventDefault();
            const targetId = item.getAttribute('href');
            if (!targetId) return;

            const targetSection = document.querySelector(targetId) as HTMLElement | null;
            if (!targetSection) return;

            // Perform smooth scroll inside main
            const targetTop = targetSection.getBoundingClientRect().top - mainEl.getBoundingClientRect().top + mainEl.scrollTop - 96; // 96px header offset
            mainEl.scrollTo({
                top: targetTop,
                behavior: 'smooth'
            });

            // Highlight target section
            targetSection.classList.remove('scroll-highlight-flash');
            void targetSection.offsetWidth; // trigger reflow
            targetSection.classList.add('scroll-highlight-flash');

            // Set URL hash without jump
            history.pushState(null, '', targetId);
        });
    });

    // Scroll to Top
    scrollTopBtn?.addEventListener('click', () => {
        mainEl.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Scroll event handler: Active section tracking & Progress indicator
    function handleScroll() {
        if (!mainEl) return;

        // 1. Reading Progress
        const scrollTop = mainEl.scrollTop;
        const scrollHeight = mainEl.scrollHeight;
        const clientHeight = mainEl.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        
        let progress = 0;
        if (maxScroll > 0) {
            progress = Math.round((scrollTop / maxScroll) * 100);
        }
        
        if (progressText) progressText.textContent = `${progress}%`;

        // 2. Active Section Tracking
        const scrollPos = scrollTop + 130; // offset slightly past header height
        let activeId = '';

        for (const id of sectionIds) {
            const section = document.querySelector(id) as HTMLElement | null;
            if (!section) continue;

            // Only check if visible (not display none/hidden)
            const style = window.getComputedStyle(section);
            if (style.display === 'none' || section.offsetHeight === 0) continue;

            const sectionTop = section.getBoundingClientRect().top - mainEl.getBoundingClientRect().top + scrollTop;
            if (sectionTop <= scrollPos) {
                activeId = id;
            }
        }

        // Update active class in navigation panel
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === activeId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Attach scroll listener to main
    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial run
    setTimeout(handleScroll, 200);

    // Also run when the details page is rendered by viewQuotation (status tracker & danger zone could show up)
    const originalViewQuotation = (window as any).viewQuotation;
    if (typeof originalViewQuotation === 'function') {
        (window as any).viewQuotation = async function(...args: any[]) {
            const result = await originalViewQuotation.apply(this, args);
            // Re-trigger scroll calculation to pick up newly shown sections
            setTimeout(handleScroll, 150);
            return result;
        };
    }
})();
