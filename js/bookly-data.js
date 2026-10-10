/* js/bookly-data.js
   Browser data layer for AYM Rent Car - exposes window.BooklyDB.

   Two interchangeable drivers behind one API:
     • Supabase driver  - used when js/supabase-client.js produced window.sbClient
     • Local driver     - localStorage demo fallback (keeps every page working
                          before Supabase is configured)

   The dashboard and the booking widget only ever call window.BooklyDB.* , so
   they don't care which driver is active. Returned shapes match what the
   existing dashboard views already expect, so the views did not change.        */
(function () {
  'use strict';

  var FB_IMG = 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=600';
  // Shown for a car whose own photo hasn't been supplied yet.
  var NO_PHOTO = 'assets/images/cars/placeholder.svg';

  // ── shared helpers ───────────────────────────────────────
  function pad(n) { return String(n).padStart(2, '0'); }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function daysBetween(a, b) {
    return Math.max(1, Math.round((parseISO(b) - parseISO(a)) / 86400000));
  }
  function todayISO() { var d = new Date(); d.setHours(0, 0, 0, 0); return isoOf(d); }

  // True when a car is fully filled in (price + its own photo). The dashboard
  // uses it to flag what the agency still has to complete.
  function isPublishable(row) {
    var price = row.price_per_day != null ? row.price_per_day : row.price;
    var photo = row.photo_url || row.img;
    return Number(price) > 0 && !!photo && photo !== FB_IMG && photo !== NO_PHOTO;
  }

  // UI ↔ DB status vocabulary (dashboard says "inprogress", DB says "active")
  function uiStatus(s) { return s === 'active' ? 'inprogress' : s; }
  function dbStatus(s) { return s === 'inprogress' ? 'active' : s; }

  // ══════════════════════════════════════════════════════════
  //  SUPABASE DRIVER
  // ══════════════════════════════════════════════════════════
  // Photo livrée avec le site (js/car-images.js) pour une voiture dont la base
  // n'a pas encore de photo_url. Les fichiers et leur référence partent ensemble
  // au déploiement : rien à écrire en base pour qu'ils s'affichent.
  function localPhoto(r) {
    if (typeof window.getCarImages !== 'function') return null;
    var e = window.getCarImages({ ref_id: r.ref_id, name: r.name });
    return e ? (e.front || e.hero || e.side || null) : null;
  }

  function supabaseDriver(sb) {
    function mapCar(r) {
      return {
        id: r.id, name: r.name, cat: r.category || '',
        price: r.price_per_day, img: r.photo_url || localPhoto(r) || FB_IMG,
        plate: r.plate || '', status: r.status || 'available',
      };
    }
    // Richer shape used by the public website (fleet / car-detail / booking widget):
    // keeps ref_id + features so pages can merge with their static metadata.
    function mapCarFull(r) {
      return {
        id: r.id, ref_id: r.ref_id != null ? r.ref_id : null,
        name: r.name, category: r.category || '',
        price_per_day: r.price_per_day, photo_url: r.photo_url || localPhoto(r) || NO_PHOTO,
        plate: r.plate || '', status: r.status || 'available',
        features: Array.isArray(r.features) ? r.features
                : (r.features == null ? [] : r.features),
      };
    }
    function mapBooking(r) {
      var c = r.client || {}, car = r.car || {};
      var name = c.full_name || (r.source === 'website' ? 'Lead (site web)' : 'Client');
      return {
        id: r.id, client: name, phone: c.phone || '', email: c.email || '',
        carId: r.car_id, pickup: r.pickup_date, return: r.return_date,
        time: r.pickup_time || '', days: r.total_days, total: r.total_price,
        deposit: r.deposit, status: uiStatus(r.status), notes: r.notes || '',
        source: r.source || 'dashboard', created: r.created_at || null, _car: car,
      };
    }

    // Look the client up by phone, then update or insert. A plain upsert would
    // need a unique (agency_id, phone) constraint the database may not have.
    async function upsertClient(agencyId, name, phone, email) {
      var row = {
        agency_id: agencyId,
        full_name: name || 'Client',
        phone: phone || null,
        email: email || null,
      };
      if (phone) {
        var found = await sb.from('clients').select('id')
          .eq('agency_id', agencyId).eq('phone', phone).limit(1).maybeSingle();
        if (found.error) throw found.error;
        if (found.data) {
          var patch = {};                       // never wipe details we already have
          if (name) patch.full_name = name;
          if (email) patch.email = email;
          if (!Object.keys(patch).length) return found.data;
          var upd = await sb.from('clients').update(patch)
            .eq('id', found.data.id).select().single();
          if (upd.error) throw upd.error;
          return upd.data;
        }
      }
      var ins = await sb.from('clients').insert(row).select().single();
      if (ins.error) throw ins.error;
      return ins.data;
    }

    return {
      mode: 'supabase',

      async getAgency(slug) {
        var s = (slug || window.BESTORE_AGENCY_SLUG || '').trim();
        var res = await sb.from('agencies').select('*').eq('slug', s).maybeSingle();
        if (!res.error && res.data) return res.data;
        var fb = window.BESTORE_AGENCY_SLUG;
        if (s !== fb) {
          var r2 = await sb.from('agencies').select('*').eq('slug', fb).maybeSingle();
          if (!r2.error && r2.data) return r2.data;
        }
        return null;
      },

      async getAgencyById(id) {
        if (!id) return null;
        var res = await sb.from('agencies').select('*').eq('id', id).maybeSingle();
        return (!res.error && res.data) ? res.data : null;
      },

      async getCarsUI(agencyId) {
        var res = await sb.from('cars').select('*')
          .eq('agency_id', agencyId).order('category');
        if (res.error) throw res.error;
        return (res.data || []).map(mapCar);
      },

      // Public website: full car list (used by fleet.html + booking widget).
      async getCars(agencyId) {
        var res = await sb.from('cars').select('*')
          .eq('agency_id', agencyId || window.BESTORE_AGENCY_ID).order('category');
        if (res.error) throw res.error;
        // The whole fleet is shown; cars without a price display "sur demande"
        // and cars without a photo use the neutral placeholder.
        return (res.data || []).map(mapCarFull);
      },

      // Public website: a single car by its Supabase id (used by car-detail.html).
      async getCarById(id) {
        if (!id) return null;
        var res = await sb.from('cars').select('*').eq('id', id).maybeSingle();
        if (res.error) throw res.error;
        return res.data ? mapCarFull(res.data) : null;
      },

      async getBookingsUI(agencyId, filters) {
        var q = sb.from('bookings')
          .select('*, client:clients(full_name, phone, email, cin), car:cars(name, category, photo_url, plate)')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false });
        if (filters && filters.status) q = q.eq('status', dbStatus(filters.status));
        if (filters && filters.date) q = q.eq('pickup_date', filters.date);
        var res = await q;
        if (res.error) throw res.error;
        return (res.data || []).map(mapBooking);
      },

      async createBookingFromDashboard(d) {
        var client = await upsertClient(d.agency_id, d.client_name, d.client_phone, d.client_email);
        var days = daysBetween(d.pickup_date, d.return_date);
        var res = await sb.from('bookings').insert({
          agency_id: d.agency_id,
          client_id: client ? client.id : null,
          car_id: d.car_id,
          pickup_date: d.pickup_date,
          return_date: d.return_date,
          pickup_time: d.pickup_time || null,
          total_days: days,
          total_price: (d.price_per_day || 0) * days,
          deposit: d.deposit || null,
          status: dbStatus(d.status || 'confirmed'),
          notes: d.notes || null,
          source: 'dashboard',
        }).select().single();
        if (res.error) throw res.error;
        return res.data;
      },

      // Public website widget → pending lead. anon key + RLS allow this insert.
      async createBookingFromWebsite(d) {
        // Prefer an explicit Supabase car id (car-detail page); fall back to ref_id.
        var carId = d.car_id || null;
        if (!carId && d.car_ref != null) {
          var cres = await sb.from('cars').select('id, price_per_day')
            .eq('agency_id', d.agency_id).eq('ref_id', d.car_ref).maybeSingle();
          if (!cres.error && cres.data) {
            carId = cres.data.id;
            if (!d.price_per_day) d.price_per_day = cres.data.price_per_day;
          }
        }
        var client = null;
        if (d.client_phone || d.client_name) {
          try { client = await upsertClient(d.agency_id, d.client_name, d.client_phone, null); }
          catch (e) { /* client upsert is best-effort for a lead */ }
        }
        var days = daysBetween(d.pickup_date, d.return_date);
        var noteBits = ['Demande via WhatsApp'];
        if (!carId && d.car_name) noteBits.push(d.car_name);
        if (d.pickup_location) noteBits.push('Lieu : ' + d.pickup_location);
        if (d.id_type)         noteBits.push('Pièce : ' + d.id_type);
        if (d.notes)           noteBits.push('Message : ' + d.notes);
        var res = await sb.from('bookings').insert({
          agency_id: d.agency_id,
          client_id: client ? client.id : null,
          car_id: carId,
          pickup_date: d.pickup_date,
          return_date: d.return_date,
          pickup_time: d.pickup_time || null,
          total_days: days,
          total_price: (d.price_per_day || 0) * days,
          status: 'pending',
          notes: noteBits.join(' · '),
          source: 'website',
        }).select().single();
        if (res.error) throw res.error;
        return res.data;
      },

      async updateBookingStatus(id, status) {
        var res = await sb.from('bookings').update({ status: dbStatus(status) }).eq('id', id);
        if (res.error) throw res.error;
      },

      // Edit booking details (car / dates / notes). Never touches status,
      // client_id, agency_id, source or created_at.
      async updateBooking(id, patch) {
        var upd = {};
        if (patch.car_id !== undefined) upd.car_id = patch.car_id;
        if (patch.pickup_date !== undefined) upd.pickup_date = patch.pickup_date;
        if (patch.return_date !== undefined) upd.return_date = patch.return_date;
        if (patch.total_days !== undefined) upd.total_days = patch.total_days;
        if (patch.total_price !== undefined) upd.total_price = patch.total_price;
        if (patch.notes !== undefined) upd.notes = patch.notes;
        var res = await sb.from('bookings').update(upd).eq('id', id);
        if (res.error) throw res.error;
      },

      async updateCar(id, patch) {
        var upd = {};
        if (patch.price != null) upd.price_per_day = patch.price;
        if (patch.status != null) upd.status = patch.status;
        if (patch.name != null) upd.name = patch.name;
        if (patch.cat != null) upd.category = patch.cat;
        if (patch.img != null) upd.photo_url = patch.img || null;
        var res = await sb.from('cars').update(upd).eq('id', id);
        if (res.error) throw res.error;
      },

      async createCar(agencyId, car) {
        var res = await sb.from('cars').insert({
          agency_id: agencyId,
          name: car.name,
          category: car.cat || null,
          price_per_day: car.price,
          plate: car.plate || null,
          photo_url: car.img || null,
          status: car.status || 'available',
        }).select().single();
        if (res.error) throw res.error;
        return mapCar(res.data);
      },

      async deleteCar(id) {
        var res = await sb.from('cars').delete().eq('id', id);
        if (res.error) throw res.error;
      },

      async deleteContract(id) {
        var res = await sb.from('contracts').delete().eq('id', id);
        if (res.error) throw res.error;
      },

      async getClientsUI(agencyId) {
        var res = await sb.from('clients').select('*').eq('agency_id', agencyId);
        if (res.error) throw res.error;
        return res.data || [];
      },

      async updateClient(id, patch) {
        var upd = {};
        if (patch.notes !== undefined) upd.notes = patch.notes;
        if (patch.blacklisted !== undefined) upd.blacklisted = patch.blacklisted;
        if (patch.blacklist_reason !== undefined) upd.blacklist_reason = patch.blacklist_reason;
        var res = await sb.from('clients').update(upd).eq('id', id);
        if (res.error) throw res.error;
      },

      // ── contracts (auth-only table, see migrate-contracts.sql) ──
      async getContracts(agencyId) {
        var res = await sb.from('contracts').select('*')
          .eq('agency_id', agencyId).order('created_at', { ascending: false });
        if (res.error) throw res.error;
        return res.data || [];
      },

      async createContract(row) {
        var res = await sb.from('contracts').insert(row).select().single();
        if (res.error) throw res.error;
        return res.data;
      },

      async updateContract(id, patch) {
        patch.updated_at = new Date().toISOString();
        var res = await sb.from('contracts').update(patch).eq('id', id).select().single();
        if (res.error) throw res.error;
        return res.data;
      },

      // Public signing link (sign.html) - goes through SECURITY DEFINER functions,
      // see migrate-contracts-remote.sql. Returns { contract, agency } or null.
      async getContractByToken(token) {
        var res = await sb.rpc('get_contract_by_token', { p_token: token });
        if (res.error) throw res.error;
        return res.data || null;
      },

      async signContractByToken(token, signature, version, method) {
        var res = await sb.rpc('sign_contract_by_token', { p_token: token, p_signature: signature, p_version: version, p_method: method || 'draw' });
        if (res.error) throw res.error;
        return res.data;
      },

      // Saved agency signature (auth-only agency_settings table).
      async getAgencySignature(agencyId) {
        var res = await sb.from('agency_settings').select('agency_signature').eq('agency_id', agencyId).maybeSingle();
        if (res.error) throw res.error;
        return res.data ? res.data.agency_signature : null;
      },

      async saveAgencySignature(agencyId, signature) {
        var res = await sb.from('agency_settings').upsert({
          agency_id: agencyId, agency_signature: signature, updated_at: new Date().toISOString(),
        });
        if (res.error) throw res.error;
      },

      subscribeContracts(agencyId, cb) {
        var ch = sb.channel('contracts-' + agencyId)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'contracts', filter: 'agency_id=eq.' + agencyId },
            function (payload) { cb(payload); })
          .subscribe();
        return function () { try { sb.removeChannel(ch); } catch (e) {} };
      },

      subscribeBookings(agencyId, cb) {
        var ch = sb.channel('bookings-' + agencyId)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'bookings', filter: 'agency_id=eq.' + agencyId },
            function (payload) { cb(payload); })
          .subscribe();
        return function () { try { sb.removeChannel(ch); } catch (e) {} };
      },
    };
  }

  // ══════════════════════════════════════════════════════════
  //  LOCAL DRIVER (localStorage demo fallback)
  // ══════════════════════════════════════════════════════════
  function localDriver() {
    var K = { cars: 'bookly_cars', bookings: 'bookly_bookings' };

    var SEED_CARS = [
      { id: 2,  name: 'Dacia Sandero',    cat: 'Économique', price: 320, img: 'assets/images/cars/sandero.webp',       plate: '12345-أ-90', status: 'available' },
      { id: 4,  name: 'Renault Clio',     cat: 'Confort',    price: 420, img: 'assets/images/cars/clio5.webp',         plate: '23451-ب-87', status: 'available' },
      { id: 5,  name: 'Peugeot 208',      cat: 'Confort',    price: 450, img: 'assets/images/cars/p208.webp',          plate: '34512-أ-12', status: 'available' },
      { id: 7,  name: 'Volkswagen T-Roc', cat: 'SUV',        price: 600, img: 'assets/images/cars/troc.webp',          plate: '45612-د-44', status: 'available' },
      { id: 11, name: 'Hyundai i20',      cat: 'Économique', price: 300, img: 'assets/images/cars/i20.webp',           plate: '56712-ب-21', status: 'available' },
      { id: 12, name: 'Skoda Octavia',    cat: 'Confort',    price: 500, img: 'assets/images/cars/skoda-octavia.webp', plate: '67812-أ-65', status: 'available' },
      { id: 14, name: 'Toyota Yaris',     cat: 'Économique', price: 330, img: 'assets/images/cars/toyota-yaris.webp',  plate: '78912-ج-33', status: 'available' },
      { id: 15, name: 'Kia Sportage',     cat: 'Luxe',       price: 700, img: 'assets/images/cars/kia-sportage.webp',  plate: '89112-د-77', status: 'available' },
    ];
    var NAMES = [
      ['Youssef El Amrani', '+212 661-203145', 'y.elamrani@gmail.com'],
      ['Fatima Zahra Bennani', '+212 662-887412', 'fz.bennani@gmail.com'],
      ['Mohammed Alaoui', '+212 663-554190', 'm.alaoui@outlook.com'],
      ['Khadija Idrissi', '+212 664-301288', 'khadija.idrissi@gmail.com'],
      ['Hamza Tazi', '+212 665-449023', 'hamza.tazi@gmail.com'],
      ['Salma Berrada', '+212 667-128844', 'salma.berrada@gmail.com'],
      ['Omar El Fassi', '+212 668-990217', 'o.elfassi@yahoo.fr'],
      ['Imane Chraibi', '+212 669-771503', 'imane.chraibi@gmail.com'],
      ['Yassine Benjelloun', '+212 661-660092', 'y.benjelloun@gmail.com'],
      ['Nadia El Khattabi', '+212 662-334871', 'nadia.kh@gmail.com'],
    ];
    function seedBookings() {
      var plan = [
        [-28, 4, 'completed'], [-25, 3, 'completed'], [-21, 5, 'completed'], [-18, 2, 'completed'],
        [-14, 6, 'completed'], [-10, 3, 'completed'], [-6, 4, 'completed'],
        [-2, 5, 'inprogress'], [-1, 4, 'inprogress'], [0, 3, 'inprogress'],
        [0, 2, 'confirmed'], [2, 5, 'confirmed'], [4, 3, 'confirmed'],
        [7, 4, 'pending'], [10, 6, 'pending'],
      ];
      var times = ['09:00', '10:00', '11:30', '14:00', '16:00'];
      var today = new Date(); today.setHours(0, 0, 0, 0);
      return plan.map(function (o, i) {
        var c = NAMES[i % NAMES.length];
        var car = SEED_CARS[i % SEED_CARS.length];
        var pick = new Date(today); pick.setDate(pick.getDate() + o[0]);
        var ret = new Date(pick); ret.setDate(ret.getDate() + o[1]);
        return {
          id: 1001 + i, client: c[0], phone: c[1], email: c[2],
          carId: car.id, pickup: isoOf(pick), return: isoOf(ret),
          time: times[i % 5], days: o[1], total: o[1] * car.price,
          deposit: car.price * 3, status: o[2], source: 'dashboard',
          notes: i % 4 === 0 ? "Livraison à l'aéroport" : '',
        };
      });
    }
    function load(k, seed) {
      try { var v = JSON.parse(localStorage.getItem(k)); if (v && v.length) return v; } catch (e) {}
      localStorage.setItem(k, JSON.stringify(seed)); return seed;
    }
    function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

    var bc = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('bookly') : null;
    function announce(payload) { if (bc) try { bc.postMessage(payload); } catch (e) {} }

    return {
      mode: 'local',

      async getAgency() {
        return {
          id: window.BESTORE_AGENCY_ID,
          name: 'AYM Rent Car', slug: window.BESTORE_AGENCY_SLUG || 'bestore-car',
          address: 'Hay Al Firdaous, Bâtiment 32, Appt. 10 - Témara', phone: '+212 6 13 61 61 45',
          city: 'Tanger', primary_color: '#C41E2A',
        };
      },
      async getAgencyById() { return this.getAgency(); },
      async getCarsUI() { return load(K.cars, SEED_CARS).map(function (c) { return Object.assign({}, c); }); },
      // Full shape mirror of the Supabase driver (ref_id === local id here).
      async getCars() {
        return load(K.cars, SEED_CARS).map(function (c) {
          return {
            id: c.id, ref_id: c.id, name: c.name, category: c.cat,
            price_per_day: c.price, photo_url: c.img || NO_PHOTO, plate: c.plate || '',
            status: c.status || 'available', features: c.features || [],
          };
        });
      },
      async getCarById(id) {
        var list = await this.getCars();
        return list.filter(function (c) { return String(c.id) === String(id); })[0] || null;
      },
      async getBookingsUI(agencyId, filters) {
        var list = load(K.bookings, seedBookings());
        if (filters && filters.status) list = list.filter(function (b) { return b.status === filters.status; });
        if (filters && filters.date) list = list.filter(function (b) { return b.pickup === filters.date; });
        return list.map(function (b) { return Object.assign({}, b); });
      },
      async createBookingFromDashboard(d) {
        var list = load(K.bookings, seedBookings());
        var days = daysBetween(d.pickup_date, d.return_date);
        var id = Math.max.apply(null, [1000].concat(list.map(function (b) { return Number(b.id) || 0; }))) + 1;
        var row = {
          id: id, client: d.client_name, phone: d.client_phone, email: d.client_email || '',
          carId: isNaN(Number(d.car_id)) ? d.car_id : Number(d.car_id),
          pickup: d.pickup_date, return: d.return_date, time: d.pickup_time || '10:00',
          days: days, total: (d.price_per_day || 0) * days, deposit: d.deposit || 0,
          status: d.status || 'confirmed', source: 'dashboard', notes: d.notes || '',
        };
        list.push(row); save(K.bookings, list); announce({ eventType: 'INSERT' });
        return row;
      },
      async createBookingFromWebsite(d) {
        var cars = load(K.cars, SEED_CARS);
        var car = null;
        if (d.car_ref != null) car = cars.filter(function (c) { return String(c.id) === String(d.car_ref); })[0];
        if (!car && d.car_id != null) car = cars.filter(function (c) { return String(c.id) === String(d.car_id); })[0];
        var list = load(K.bookings, seedBookings());
        var days = daysBetween(d.pickup_date, d.return_date);
        var id = Math.max.apply(null, [1000].concat(list.map(function (b) { return Number(b.id) || 0; }))) + 1;
        var price = d.price_per_day || (car ? car.price : 0);
        var noteBits = ['Demande via WhatsApp'];
        if (!car && d.car_name) noteBits.push(d.car_name);
        if (d.pickup_location) noteBits.push('Lieu : ' + d.pickup_location);
        if (d.id_type)         noteBits.push('Pièce : ' + d.id_type);
        if (d.notes)           noteBits.push('Message : ' + d.notes);
        var row = {
          id: id, client: d.client_name || 'Lead (site web)', phone: d.client_phone || '', email: '',
          carId: car ? car.id : (d.car_id != null ? d.car_id : (d.car_ref != null ? d.car_ref : null)),
          pickup: d.pickup_date, return: d.return_date, time: d.pickup_time || '10:00',
          days: days, total: price * days, deposit: 0, status: 'pending', source: 'website',
          created: new Date().toISOString(),
          notes: noteBits.join(' · '),
        };
        list.push(row); save(K.bookings, list); announce({ eventType: 'INSERT' });
        return row;
      },
      async updateBookingStatus(id, status) {
        var list = load(K.bookings, seedBookings());
        var b = list.filter(function (x) { return String(x.id) === String(id); })[0];
        if (b) { b.status = status; save(K.bookings, list); announce({ eventType: 'UPDATE' }); }
      },
      async updateBooking(id, patch) {
        var list = load(K.bookings, seedBookings());
        var b = list.filter(function (x) { return String(x.id) === String(id); })[0];
        if (b) {
          if (patch.car_id !== undefined) b.carId = isNaN(Number(patch.car_id)) ? patch.car_id : Number(patch.car_id);
          if (patch.pickup_date !== undefined) b.pickup = patch.pickup_date;
          if (patch.return_date !== undefined) b.return = patch.return_date;
          if (patch.total_days !== undefined) b.days = patch.total_days;
          if (patch.total_price !== undefined) b.total = patch.total_price;
          if (patch.notes !== undefined) b.notes = patch.notes;
          save(K.bookings, list); announce({ eventType: 'UPDATE' });
        }
      },
      async updateCar(id, patch) {
        var cars = load(K.cars, SEED_CARS);
        var c = cars.filter(function (x) { return String(x.id) === String(id); })[0];
        if (c) {
          if (patch.price != null) c.price = patch.price;
          if (patch.status != null) c.status = patch.status;
          if (patch.name != null) c.name = patch.name;
          if (patch.cat != null) c.cat = patch.cat;
          if (patch.img != null) c.img = patch.img || FB_IMG;
          save(K.cars, cars); announce({ eventType: 'UPDATE' });
        }
      },
      async createCar(agencyId, car) {
        var cars = load(K.cars, SEED_CARS);
        var id = Math.max.apply(null, [0].concat(cars.map(function (c) { return Number(c.id) || 0; }))) + 1;
        var row = {
          id: id, name: car.name, cat: car.cat || '', price: car.price,
          img: car.img || FB_IMG, plate: car.plate || '', status: car.status || 'available',
        };
        cars.push(row); save(K.cars, cars); announce({ eventType: 'UPDATE' });
        return Object.assign({}, row);
      },
      async deleteCar(id) {
        var cars = load(K.cars, SEED_CARS).filter(function (c) { return String(c.id) !== String(id); });
        save(K.cars, cars); announce({ eventType: 'UPDATE' });
      },
      async deleteContract(id) {
        var list = JSON.parse(localStorage.getItem('bookly_contracts') || '[]')
          .filter(function (c) { return String(c.id) !== String(id); });
        localStorage.setItem('bookly_contracts', JSON.stringify(list));
        announce({ eventType: 'DELETE', table: 'contracts' });
      },
      async getClientsUI() {
        try {
          var stored = JSON.parse(localStorage.getItem('bookly_client_meta') || '{}');
          return Object.keys(stored).map(function(phone) {
            var m = stored[phone];
            return { id: phone, phone: phone, full_name: '', notes: m.notes || '', blacklisted: m.blacklisted || false, blacklist_reason: m.blacklist_reason || '' };
          });
        } catch(e) { return []; }
      },
      async updateClient(id, patch) {
        try {
          var stored = JSON.parse(localStorage.getItem('bookly_client_meta') || '{}');
          if (!stored[id]) stored[id] = {};
          if (patch.notes !== undefined) stored[id].notes = patch.notes;
          if (patch.blacklisted !== undefined) stored[id].blacklisted = patch.blacklisted;
          if (patch.blacklist_reason !== undefined) stored[id].blacklist_reason = patch.blacklist_reason;
          localStorage.setItem('bookly_client_meta', JSON.stringify(stored));
        } catch(e) {}
      },
      async getContracts() {
        try { return JSON.parse(localStorage.getItem('bookly_contracts') || '[]'); }
        catch (e) { return []; }
      },
      async createContract(row) {
        var list = await this.getContracts();
        var num = Math.max.apply(null, [0].concat(list.map(function (c) { return Number(c.number) || 0; }))) + 1;
        var now = new Date().toISOString();
        var rec = Object.assign({ status: 'draft' }, row, {
          id: 'ct-' + Date.now(), number: num, created_at: now, updated_at: now,
        });
        list.unshift(rec);
        localStorage.setItem('bookly_contracts', JSON.stringify(list));
        return rec;
      },
      async updateContract(id, patch) {
        var list = await this.getContracts();
        var c = list.filter(function (x) { return String(x.id) === String(id); })[0];
        if (!c) throw new Error('Contrat introuvable');
        Object.assign(c, patch, { updated_at: new Date().toISOString() });
        localStorage.setItem('bookly_contracts', JSON.stringify(list));
        announce({ eventType: 'UPDATE', table: 'contracts' });
        return c;
      },
      // Demo only: the link works in the same browser (no server to share data).
      async getContractByToken(token) {
        var list = await this.getContracts();
        var c = list.filter(function (x) { return x.share_token && x.share_token === token; })[0];
        if (!c || new Date(c.share_expires) <= new Date()) return null;
        var a = await this.getAgency();
        return { contract: c, agency: { name: a.name, address: a.address, phone: a.phone } };
      },
      async signContractByToken(token, signature, version, method) {
        var found = await this.getContractByToken(token);
        if (!found) throw new Error('Lien invalide ou expiré');
        var c = found.contract;
        if (c.status !== 'draft' || c.client_signature) throw new Error('Ce contrat est déjà signé');
        if (version !== c.updated_at) throw new Error("Le contrat a été modifié par l'agence. Rechargez la page pour lire la nouvelle version.");
        var now = new Date().toISOString();
        var patch = { client_signature: signature, client_signed_at: now, client_sign_ua: navigator.userAgent.slice(0, 300), client_sign_method: method === 'type' ? 'type' : 'draw' };
        if (c.agency_signature) { patch.status = 'signed'; patch.signed_at = now; }
        await this.updateContract(c.id, patch);
        return this.getContractByToken(token);
      },
      async getAgencySignature() {
        try { return localStorage.getItem('bookly_agency_signature'); } catch (e) { return null; }
      },
      async saveAgencySignature(agencyId, signature) {
        if (signature) localStorage.setItem('bookly_agency_signature', signature);
        else localStorage.removeItem('bookly_agency_signature');
      },
      subscribeContracts(agencyId, cb) {
        if (!bc) return function () {};
        var h = function (ev) { if (ev.data && ev.data.table === 'contracts') cb(ev.data); };
        bc.addEventListener('message', h);
        return function () { bc.removeEventListener('message', h); };
      },
      subscribeBookings(agencyId, cb) {
        if (!bc) return function () {};
        var h = function (ev) { cb(ev.data || { eventType: 'UPDATE' }); };
        bc.addEventListener('message', h);
        return function () { bc.removeEventListener('message', h); };
      },
    };
  }

  // ── pick driver + expose ─────────────────────────────────
  var driver = window.sbClient ? supabaseDriver(window.sbClient) : localDriver();
  driver.isPublishable = isPublishable;
  window.BooklyDB = driver;
})();
