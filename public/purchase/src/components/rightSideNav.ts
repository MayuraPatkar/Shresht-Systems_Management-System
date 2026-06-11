(() => {
    // DOM Elements
    const scrollContainer = document.getElementById('view') as HTMLElement | null;
    const scrollTopBtn = document.getElementById('floating-nav-scroll-top') as HTMLButtonElement | null;
    const sidebar = document.getElementById('right-nav-sidebar') as HTMLElement | null;

    if (!scrollContainer) {
        console.error('Purchase view scroll container not found');
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

            // Perform smooth scroll inside the scroll container (#view)
            const targetTop = targetSection.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop - 16; 
            scrollContainer.scrollTo({
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
        scrollContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Scroll event handler: Active section tracking
    function handleScroll() {
        if (!scrollContainer) return;

        // Active Section Tracking
        const scrollTop = scrollContainer.scrollTop;
        const scrollPos = scrollTop + 100; // offset slightly past top threshold
        let activeId = '';

        for (const id of sectionIds) {
            const section = document.querySelector(id) as HTMLElement | null;
            if (!section) continue;

            // Only check if visible (not display none/hidden)
            const style = window.getComputedStyle(section);
            if (style.display === 'none' || section.offsetHeight === 0) continue;

            const sectionTop = section.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollTop;
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

    // Auto show/hide sidebar based on view visibility
    function updateSidebarVisibility() {
        const viewSection = document.getElementById('view');
        if (!viewSection || !sidebar) return;

        const isViewActive = window.getComputedStyle(viewSection).display !== 'none';
        if (isViewActive) {
            if (window.innerWidth >= 768) {
                sidebar.style.display = 'flex';
            } else {
                sidebar.style.display = 'none';
            }
        } else {
            sidebar.style.display = 'none';
        }
    }

    // Attach scroll listener to scrollContainer
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Watch display changes on viewSection
    const viewSection = document.getElementById('view');
    if (viewSection) {
        const observer = new MutationObserver(updateSidebarVisibility);
        observer.observe(viewSection, { attributes: true, attributeFilter: ['style'] });
    }
    window.addEventListener('resize', updateSidebarVisibility);

    // Initial run
    setTimeout(() => {
        updateSidebarVisibility();
        handleScroll();
    }, 200);

    // Also run when the details page is rendered by viewPurchase (danger zone or items could load/change)
    const originalViewPurchase = (window as any).viewPurchase;
    if (typeof originalViewPurchase === 'function') {
        (window as any).viewPurchase = async function(...args: any[]) {
            const result = await originalViewPurchase.apply(this, args);
            // Re-trigger scroll calculation to pick up newly shown sections
            updateSidebarVisibility();
            setTimeout(handleScroll, 150);
            return result;
        };
    }
})();
