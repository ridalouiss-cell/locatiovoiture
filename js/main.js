// Navbar: add shadow on scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('navbar--scrolled', window.scrollY > 10);
}, { passive: true });

// Mobile drawer menu
document.addEventListener('DOMContentLoaded', () => {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const closeBtn   = document.getElementById('mobile-menu-close');
  if (!hamburger || !mobileMenu) return;

  function closeMenu() {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('active');
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  mobileMenu.addEventListener('click', e => {
    if (e.target === mobileMenu) closeMenu();
  });

  // Mark active page link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });
});

// Hero: GSAP fade-in on load
document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined') {
    gsap.from('#heroLabel',   { opacity: 0, y: 18, duration: 0.6, delay: 0.15, ease: 'power2.out' });
    gsap.from('#heroHeading', { opacity: 0, y: 32, duration: 0.8, delay: 0.35, ease: 'power2.out' });
    gsap.from('#heroSubtext', { opacity: 0, y: 20, duration: 0.6, delay: 0.65, ease: 'power2.out' });
    gsap.from('.hero__ctas',  { opacity: 0, y: 20, duration: 0.6, delay: 0.85, ease: 'power2.out' });
    gsap.from('.hero__booking', { opacity: 0, y: 28, duration: 0.7, delay: 1.05, ease: 'power2.out' });
  }
});

// Register ScrollTrigger (used by the section reveals below)
document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }
});

// Fleet carousel
document.addEventListener('DOMContentLoaded', () => {
  // The six cars the agency wants on the home page, in this order. Each id is
  // the Supabase UUID so a card links straight to its detail page. These
  // entries are the first paint; loadHomeCars() below refreshes name, price
  // and photo from Supabase and drops any car that left the fleet.
  const HOME_CAR_NAMES = [
    'Porsche Macan',
    'Audi Q3 2026',
    'Volkswagen Golf 8.5 2026',
    'Opel Corsa',
    'Renault Clio 5 2025',
    'Dacia Logan',
  ];

  let cars = [
    {
      id: '4f0ad7fd-42f7-4273-a7f4-3461a14ae378',
      name: { ar: 'بورش ماكان', fr: 'Porsche Macan', en: 'Porsche Macan' },
      cat: { ar: 'فاخرة', fr: 'Luxe', en: 'Luxury' },
      catKey: 'Luxury', price: '2500', doors: 4, passengers: 5,
      img: 'assets/images/cars/porsche-macan.webp'
    },
    {
      id: 'a87a5971-e5b6-4522-aca8-ecd3f7933e31',
      name: { ar: 'أودي Q3 2026', fr: 'Audi Q3 2026', en: 'Audi Q3 2026' },
      cat: { ar: 'دفع رباعي', fr: 'SUV', en: 'SUV' },
      catKey: 'SUV', price: '1500', doors: 4, passengers: 5,
      img: 'assets/images/cars/audi-q3.webp'
    },
    {
      id: '0171cc19-cf0f-47f4-b6fd-d736cea5dfa6',
      name: { ar: 'فولكسفاغن غولف 8.5 2026', fr: 'Volkswagen Golf 8.5 2026', en: 'Volkswagen Golf 8.5 2026' },
      cat: { ar: 'مريحة', fr: 'Confort', en: 'Comfort' },
      catKey: 'Sedan', price: '900', doors: 4, passengers: 5,
      img: 'assets/images/cars/vw-golf-85.webp'
    },
    {
      id: '31eb924f-6b66-40c4-8169-833075aef019',
      name: { ar: 'أوبل كورسا', fr: 'Opel Corsa', en: 'Opel Corsa' },
      cat: { ar: 'اقتصادية', fr: 'Économique', en: 'Economy' },
      catKey: 'Economy', price: '350', doors: 4, passengers: 5,
      img: 'assets/images/cars/opel-corsa.webp'
    },
    {
      id: '2b8cb2a6-f0a1-41f0-b95d-76291bc3d9d4',
      name: { ar: 'رونو كليو 5 2025', fr: 'Renault Clio 5 2025', en: 'Renault Clio 5 2025' },
      cat: { ar: 'اقتصادية', fr: 'Économique', en: 'Economy' },
      catKey: 'Economy', price: '350', doors: 4, passengers: 5,
      img: 'assets/images/cars/clio5.webp'
    },
    {
      id: '0085fc15-dfb2-4fbc-bbcc-0968af901200',
      name: { ar: 'داسيا لوغان', fr: 'Dacia Logan', en: 'Dacia Logan' },
      cat: { ar: 'اقتصادية', fr: 'Économique', en: 'Economy' },
      catKey: 'Economy', price: '300', doors: 4, passengers: 5,
      img: 'assets/images/cars/dacia-logan.webp'
    },
  ];

  const GAP    = 30;
  let   STEP   = 0;   // card width + gap, measured: cards are sized by CSS to fit whole

  const track   = document.getElementById('fleetTrack');
  const prevBtn = document.getElementById('fleetPrev');
  const nextBtn = document.getElementById('fleetNext');
  if (!track || !prevBtn || !nextBtn) return;

  const doorIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3.75" y="1.25" width="12.5" height="17.5" rx="1.5" stroke="#616161" stroke-width="1.4"/><circle cx="14" cy="10" r="1.1" fill="#616161"/></svg>`;
  const paxIcon  = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="5.5" r="3" stroke="#616161" stroke-width="1.4"/><path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#616161" stroke-width="1.4" stroke-linecap="round"/><circle cx="15.5" cy="6.5" r="2" stroke="#616161" stroke-width="1.2"/><path d="M13.5 17.5c0-2.1 1.2-3.9 3-4.7" stroke="#616161" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  const arrowSvg = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.5 13.5L13.5 2.5M13.5 2.5H6M13.5 2.5V10" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const fallbackImg = 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600';

  function renderFleetCards() {
    track.innerHTML = '';
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ar';
    const t = (typeof translations !== 'undefined') ? translations[lang] : null;
    const doorsLabel = t ? t['fleet.doors'] : 'Doors';
    const passLabel  = t ? t['fleet.pass']  : 'Passengers';
    const perDay     = t ? t['fleet.perday'] : '/ day';
    const detailsLabel = t ? (t['fleet.details'] || t['fleet.reserve']) : 'View details';

    cars.forEach(car => {
      const carName = car.name[lang] || car.name.en;
      const carCat  = car.cat[lang]  || car.cat.en;
      const detailUrl = `car-detail.html?id=${encodeURIComponent(car.id)}`;
      const card = document.createElement('div');
      card.className = 'fleet__card';
      card.dataset.price = car.price;
      card.dataset.category = car.catKey;
      card.innerHTML = `
        <div class="fleet__card-img-wrap">
          <img class="fleet__card-img" src="${car.img}" alt="${carName}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}'">
          <span class="fleet__card-badge">${carCat}</span>
        </div>
        <div class="fleet__card-body">
          <h3 class="fleet__card-name">${carName}</h3>
          <div class="fleet__card-specs">
            <div class="fleet__spec-row">
              <span class="fleet__spec-label">${doorIcon}${doorsLabel}</span>
              <span class="fleet__spec-val">${car.doors}</span>
            </div>
            <div class="fleet__spec-row">
              <span class="fleet__spec-label">${paxIcon}${passLabel}</span>
              <span class="fleet__spec-val">${car.passengers}</span>
            </div>
          </div>
          <div class="fleet__card-footer">
            <div class="fleet__card-price">
              <span class="fleet__price-amount">${car.price} MAD</span>
              <span class="fleet__price-unit">${perDay}</span>
            </div>
          </div>
          <a href="${detailUrl}" class="fleet__reserve-btn" aria-label="View details for ${car.name.en}">
            ${arrowSvg}<span>${detailsLabel}</span>
          </a>
        </div>`;

      // Entire card navigates to the single car page
      card.style.cursor = 'pointer';
      card.addEventListener('click', function (e) {
        // Let the WhatsApp reserve button keep its own behavior
        if (e.target.closest('.fleet__reserve-btn')) return;
        window.location.href = 'car-detail.html?id=' + car.id;
      });

      track.appendChild(card);
    });

    calcMax();
    goTo(0);
  }

  window.renderFleetCards = renderFleetCards;

  let current  = 0;
  let maxIndex = 0;
  let maxShift = 0;   // px: the last card sits flush with the right edge, no empty gap

  function calcMax() {
    const wrapW  = track.parentElement.clientWidth;
    const card   = track.querySelector('.fleet__card');
    STEP = (card ? card.getBoundingClientRect().width : 327.5) + GAP;
    maxShift = Math.max(0, track.scrollWidth - wrapW);
    maxIndex = Math.ceil(maxShift / STEP - 0.01);
  }

  function goTo(idx) {
    const rtl = document.documentElement.dir === 'rtl';
    current = Math.max(0, Math.min(idx, maxIndex));
    const shift = Math.min(current * STEP, maxShift);
    track.style.transform = rtl
      ? `translateX(${shift}px)`
      : `translateX(-${shift}px)`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current >= maxIndex;
  }

  renderFleetCards();

  // Refresh the six home-page cards from Supabase, so a price, a photo or a
  // name edited in the dashboard shows here without touching this file. The
  // hard-coded list above stays on screen if the load fails, and a car that
  // is no longer in the fleet is dropped rather than advertised.
  async function loadHomeCars() {
    if (!window.BooklyDB || typeof window.BooklyDB.getCars !== 'function') return;
    let rows;
    try {
      rows = await window.BooklyDB.getCars(window.BESTORE_AGENCY_ID);
    } catch (e) {
      console.warn('[AYM] home fleet: Supabase load failed, keeping the static list.', e);
      return;
    }
    if (!Array.isArray(rows) || !rows.length) return;

    const byName = {};
    rows.forEach(r => { if (r && r.name) byName[r.name] = r; });

    const fresh = [];
    HOME_CAR_NAMES.forEach(name => {
      const row = byName[name];
      if (!row) return;                                  // left the fleet
      const old = cars.filter(c => c.name.fr === name)[0];
      fresh.push({
        id: row.id,
        name: old ? old.name : { ar: row.name, fr: row.name, en: row.name },
        cat: old ? old.cat : { ar: row.category, fr: row.category, en: row.category },
        catKey: old ? old.catKey : 'Economy',
        price: String(row.price_per_day),
        doors: old ? old.doors : 4,
        passengers: old ? old.passengers : 5,
        img: row.photo_url || (old ? old.img : fallbackImg),
      });
    });

    if (!fresh.length) return;                           // nothing matched, keep what is shown
    cars = fresh;
    renderFleetCards();
  }

  // BooklyDB is loaded after this file, so wait for the page to settle.
  if (document.readyState === 'complete') loadHomeCars();
  else window.addEventListener('load', loadHomeCars);

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  window.addEventListener('resize', () => { calcMax(); goTo(Math.min(current, maxIndex)); }, { passive: true });

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.from('#fleetHeader > *', {
      opacity: 0, y: 30, duration: 0.7, ease: 'power2.out', stagger: 0.13,
      scrollTrigger: { trigger: '.fleet', start: 'top 78%', once: true },
    });
    gsap.from('.fleet__track', {
      opacity: 0, y: 40, duration: 0.75, ease: 'power2.out',
      scrollTrigger: { trigger: '.fleet__carousel-wrap', start: 'top 85%', once: true },
    });
  }
});

// How It Works: GSAP ScrollTrigger reveal
document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.from('#hiwLeft > *', {
      opacity: 0,
      y: 30,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.12,
      scrollTrigger: { trigger: '.hiw', start: 'top 78%', once: true },
    });
    gsap.from('#hiwRight', {
      opacity: 0,
      x: 60,
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.hiw', start: 'top 78%', once: true },
    });
  }
});

// Testimonials: duplicate each column's cards for a seamless vertical loop,
// then reveal the header with GSAP (matches the other section reveals)
document.addEventListener('DOMContentLoaded', () => {
  // Add a 5-star rating above each review's text (before cloning so both
  // halves of the seamless loop get the stars).
  document.querySelectorAll('.tcard').forEach(card => {
    if (card.querySelector('.tcard__stars')) return;
    const stars = document.createElement('div');
    stars.className = 'tcard__stars';
    stars.setAttribute('aria-label', '5 out of 5 stars');
    stars.textContent = '★★★★★';
    card.insertBefore(stars, card.firstChild);
  });

  document.querySelectorAll('.testimonials__track').forEach(track => {
    // Cloning copies the already-translated text and data-i18n attributes,
    // so language switching still updates both halves of the loop.
    track.innerHTML += track.innerHTML;
  });

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.from('#testimonialsHeader > *', {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.12,
      scrollTrigger: { trigger: '.testimonials', start: 'top 80%', once: true },
    });
  }
});

// Booking bar: set min dates, validate return >= pickup, send WhatsApp message
document.addEventListener('DOMContentLoaded', () => {
  const btn        = document.getElementById('bookingSubmit');
  const pickupDate = document.getElementById('bk-date');
  const returnDate = document.getElementById('bk-return');
  const returnErr  = document.getElementById('bk-return-error');
  if (!btn || !pickupDate) return;

  const today = new Date().toISOString().split('T')[0];
  pickupDate.min = today;
  if (returnDate) returnDate.min = today;

  pickupDate.addEventListener('change', () => {
    if (returnDate) {
      returnDate.min = pickupDate.value || today;
      if (returnDate.value && returnDate.value < pickupDate.value) {
        returnDate.value = '';
        if (returnErr) returnErr.textContent = '';
      }
    }
  });

  if (returnDate) {
    returnDate.addEventListener('change', () => {
      if (returnErr) {
        if (pickupDate.value && returnDate.value && returnDate.value < pickupDate.value) {
          returnErr.textContent = 'Return date must be after pickup date';
          returnDate.value = '';
        } else {
          returnErr.textContent = '';
        }
      }
    });
  }

  btn.addEventListener('click', () => {
    const phone    = document.getElementById('bk-phone').value.trim()    || '-';
    const location = document.getElementById('bk-location').value.trim() || '-';
    const pickup   = pickupDate.value || '-';
    const rtn      = returnDate ? returnDate.value || '-' : '-';

    if (returnDate && pickupDate.value && returnDate.value && returnDate.value < pickupDate.value) {
      if (returnErr) returnErr.textContent = 'Return date must be after pickup date';
      return;
    }

    const msg =
      `Hello AYM Rent Car! I'd like to book a rental.\n\n` +
      `📞 Phone: ${phone}\n` +
      `📍 Pickup Location: ${location}\n` +
      `📅 Pickup Date: ${pickup}\n` +
      `📅 Return Date: ${rtn}`;

    window.open(
      `https://wa.me/212613616145?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  });
});

// FAQ: accordion toggle
document.addEventListener('DOMContentLoaded', () => {
  const faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq__question');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('faq__item--open');
      faqItems.forEach(i => {
        i.classList.remove('faq__item--open');
        i.querySelector('.faq__question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('faq__item--open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
});

// Why Choose Us: GSAP staggered ScrollTrigger reveal
document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.from('#wcuHeader > *', {
      opacity: 0,
      y: 30,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.12,
      scrollTrigger: { trigger: '.wcu', start: 'top 78%', once: true },
    });

    gsap.from('#wcuLeft .wcu__feature', {
      opacity: 0,
      x: -40,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.15,
      scrollTrigger: { trigger: '.wcu__grid', start: 'top 80%', once: true },
    });

    gsap.from('#wcuCenter', {
      opacity: 0,
      y: 50,
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.wcu__grid', start: 'top 80%', once: true },
    });

    gsap.from('#wcuRight .wcu__feature', {
      opacity: 0,
      x: 40,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.15,
      scrollTrigger: { trigger: '.wcu__grid', start: 'top 80%', once: true },
    });
  }
});
