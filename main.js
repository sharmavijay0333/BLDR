// ============================================================
// BLDR — main.js
// Replace YOUR_GOOGLE_CLIENT_ID in ALL HTML files with your
// actual Client ID from Google Cloud Console.
// ============================================================

// --- Global Google Sign-In callback (must be on window scope) ---
window.handleGoogleSignIn = function (response) {
    // Decode the JWT credential returned by Google
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const user = {
        name: payload.name,
        email: payload.email,
        photo: payload.picture,
        sub: payload.sub // unique Google user ID
    };
    localStorage.setItem('bldr_user', JSON.stringify(user));
    location.reload();
};

document.addEventListener('DOMContentLoaded', () => {

    // --- State ---
    let currentUser = JSON.parse(localStorage.getItem('bldr_user')) || null;
    let cartItems = currentUser ? (JSON.parse(localStorage.getItem('bldr_cart')) || []) : [];

    function saveCart() {
        if (currentUser) {
            localStorage.setItem('bldr_cart', JSON.stringify(cartItems));
        }
    }

    // --- Checkout Guard ---
    if (window.location.pathname.includes('checkout.html') && !currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // --- Custom Cursor ---
    const cursor = document.querySelector('.cursor');
    if (cursor) {
        document.addEventListener('mousemove', e => {
            cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
        });
    }

    // --- Nav Scroll ---
    const nav = document.getElementById('main-nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 80);
        });
    }

    // --- Reveal Animations ---
    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
        });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    // --- DOM Refs ---
    const cards = document.querySelectorAll('.card');
    const modal = document.getElementById('asset-modal');
    const cartTrigger = document.getElementById('cart-trigger');
    const cartSidebar = document.getElementById('cart-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const closeCart = document.querySelector('.close-cart');
    const cartList = document.getElementById('cart-items-list');
    const cartTotal = document.getElementById('cart-total-price-sidebar') || document.getElementById('cart-total-price');
    const toast = document.getElementById('cart-toast');
    const searchBtn = document.getElementById('search-trigger');
    const searchOver = document.getElementById('search-overlay');
    const searchClose = document.querySelector('.close-search');
    const searchInput = document.getElementById('search-input');
    const searchRes = document.getElementById('search-results');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const cartLinks = document.querySelectorAll('.cart-link');
    const authTrigger = document.getElementById('auth-trigger');
    const authModal = document.getElementById('auth-modal');

    // --- Bootstrap UI ---
    updateCartUI();
    updateAuthUI();

    // --- Auth UI ---
    function updateAuthUI() {
        if (!authTrigger) return;
        if (currentUser) {
            authTrigger.innerText = currentUser.name.split(' ')[0];
            authTrigger.style.opacity = '1';
        } else {
            authTrigger.innerText = 'Sign In';
            authTrigger.style.opacity = '0.6';
        }
    }

    authTrigger?.addEventListener('click', e => {
        e.preventDefault();
        if (currentUser) {
            if (confirm("Sign out? This will clear your bag.")) {
                localStorage.removeItem('bldr_user');
                localStorage.removeItem('bldr_cart');
                location.href = 'index.html';
            }
        } else {
            authModal?.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });

    // --- Filter Tabs ---
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const cat = tab.dataset.category;
            cards.forEach(card => {
                card.style.display = (cat === 'all' || card.dataset.category === cat) ? 'flex' : 'none';
            });
        });
    });

    // --- Card Click → Modal ---
    cards.forEach(card => {
        card.addEventListener('click', () => {
            if (!modal) return;
            const title = card.querySelector('.card-title')?.innerText || '';
            const price = card.querySelector('.card-price')?.innerText || '';
            const cat = card.querySelector('.card-category')?.innerText || '';
            const bg = card.querySelector('.placeholder-img')?.style.background || '';

            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-price').innerText = price;
            document.getElementById('modal-cat').innerText = cat;
            document.getElementById('modal-img').style.background = bg;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    // --- Close Modals ---
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
            document.body.style.overflow = '';
        });
    });

    // --- Add to Bag (requires login) ---
    document.querySelector('.add-to-cart')?.addEventListener('click', () => {
        if (!currentUser) {
            document.getElementById('asset-modal').classList.remove('active');
            authModal?.classList.add('active');
            return;
        }
        const title = document.getElementById('modal-title').innerText;
        const price = document.getElementById('modal-price').innerText;
        cartItems.push({ title, price });
        saveCart();
        updateCartUI();
        document.getElementById('asset-modal').classList.remove('active');
        document.body.style.overflow = '';
        showToast();
        setTimeout(() => openCart(), 700);
    });

    // --- Cart UI ---
    function updateCartUI() {
        const total = cartItems.reduce((sum, i) => {
            const p = parseFloat(i.price.replace('$', '')) || 0;
            return sum + p;
        }, 0);

        cartLinks.forEach(l => l.innerText = `Bag (${cartItems.length})`);
        if (cartTotal) cartTotal.innerText = `$${total.toFixed(2)}`;

        if (cartList) {
            cartList.innerHTML = cartItems.length === 0
                ? '<p class="empty-msg">Your bag is empty.</p>'
                : cartItems.map((item, idx) => `
                    <div class="cart-item-ui">
                        <div class="cart-item-swatch"></div>
                        <div style="flex-grow:1;">
                            <h4>${item.title}</h4>
                            <p>${item.price}</p>
                        </div>
                        <button class="remove-item" data-idx="${idx}" style="background:none;border:none;color:#555;cursor:pointer;">&times;</button>
                    </div>`).join('');

            document.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', e => {
                    cartItems.splice(e.target.dataset.idx, 1);
                    saveCart();
                    updateCartUI();
                });
            });
        }

        // Sync checkout page summary
        const checkoutList = document.getElementById('checkout-items-list');
        const checkoutTotal = document.getElementById('checkout-total-price');
        if (checkoutList) {
            checkoutList.innerHTML = cartItems.length === 0
                ? '<p style="color:#555">Your bag is empty.</p>'
                : cartItems.map(i => `<div class="checkout-item"><span>${i.title}</span><span>${i.price}</span></div>`).join('');
            if (checkoutTotal) checkoutTotal.innerText = `$${total.toFixed(2)}`;
        }
    }

    function openCart() { cartSidebar?.classList.add('active'); backdrop?.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeCartFn() { cartSidebar?.classList.remove('active'); backdrop?.classList.remove('active'); document.body.style.overflow = ''; }

    cartTrigger?.addEventListener('click', e => { e.preventDefault(); openCart(); });
    closeCart?.addEventListener('click', closeCartFn);
    backdrop?.addEventListener('click', closeCartFn);

    document.querySelector('.checkout-btn')?.addEventListener('click', () => {
        if (!currentUser) { authModal?.classList.add('active'); }
        else { window.location.href = 'checkout.html'; }
    });

    function showToast() {
        toast?.classList.add('active');
        setTimeout(() => toast?.classList.remove('active'), 2800);
    }

    // --- Search ---
    searchBtn?.addEventListener('click', () => { searchOver?.classList.add('active'); document.body.style.overflow = 'hidden'; searchInput?.focus(); });
    searchClose?.addEventListener('click', () => { searchOver?.classList.remove('active'); document.body.style.overflow = ''; });

    searchInput?.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        if (!searchRes) return;
        searchRes.innerHTML = '';
        if (q.length < 2) return;
        cards.forEach(card => {
            const title = card.querySelector('.card-title')?.innerText || '';
            if (title.toLowerCase().includes(q)) {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.textContent = title;
                div.addEventListener('click', () => {
                    searchOver.classList.remove('active');
                    document.body.style.overflow = '';
                    card.click();
                });
                searchRes.appendChild(div);
            }
        });
    });

    // --- Anchor smooth scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', function (e) {
            const id = this.getAttribute('href').slice(1);
            if (!id) return;
            const el = document.getElementById(id);
            if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
        });
    });
});
