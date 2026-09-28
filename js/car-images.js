/**
 * car-images.js
 * Maps each car to its 3 gallery photos (hero / front / side), sourced from:
 *   - assets/images/34/          → hero / splash (front 3/4)
 *   - assets/images/cars/        → front view
 *   - assets/images/side view/   → side profile
 *
 * Loaded BEFORE car-detail.js. Exposes:
 *   - window.CAR_IMAGES            the raw mapping (keyed by slug)
 *   - window.getCarImages(car)    resolves a car (by ref_id, then name) → {hero, front, side, extra?}
 *
 * `ref` matches the Supabase cars.ref_id so lookup works regardless of the
 * URL using a Supabase UUID or a numeric ref.
 */
(function (global) {
  'use strict';

  var CAR_IMAGES = {
    'toyota-yaris': {
      ref: 14,
      hero:  'assets/images/34/yaris.webp',
      front: 'assets/images/cars/toyota-yaris.webp',
      side:  'assets/images/side view/yaris.webp'
    },
    'renault-clio': {
      ref: 4,
      hero:  'assets/images/34/clio 5.webp',
      front: 'assets/images/cars/clio5.webp',
      side:  'assets/images/side view/clio 5.webp'
    },
    'dacia-sandero': {
      ref: 2,
      hero:  'assets/images/34/sandero.webp',
      front: 'assets/images/cars/sandero.webp',
      side:  'assets/images/side view/sandero.webp'
    },
    'peugeot-208': {
      ref: 5,
      hero:  'assets/images/34/208.webp',
      front: 'assets/images/cars/p208.webp',
      side:  'assets/images/side view/208.webp'
    },
    'skoda-octavia': {
      ref: 12,
      hero:  'assets/images/34/skoda octavia.webp',
      front: 'assets/images/cars/skoda-octavia.webp',
      side:  'assets/images/side view/skoda octavia.webp'
    },
    'volkswagen-troc': {
      ref: 7,
      hero:  'assets/images/34/troc.webp',
      front: 'assets/images/cars/troc.webp',
      side:  'assets/images/side view/troc.webp'
    },
    'hyundai-i20': {
      ref: 11,
      hero:  'assets/images/34/i20.webp',
      front: 'assets/images/cars/i20.webp',
      side:  'assets/images/side view/i20.webp'
    },
    'kia-sportage': {
      ref: 15,
      hero:  'assets/images/34/kia sportage.webp',
      front: 'assets/images/cars/kia-sportage.webp',
      side:  'assets/images/side view/kia sportage.webp'
    },

    /* Ajouts : photos studio fournies par l'agence. Un angle absent
       (modèle différent dans le dossier source, ou photo manquante) est
       simplement omis : la fiche retombe sur la photo principale. */
    'opel-corsa': {
      ref: 20,
      hero:  'assets/images/34/opel-corsa.webp',
      front: 'assets/images/cars/opel-corsa.webp',
      side:  'assets/images/side view/opel-corsa.webp'
    },
    'dacia-logan': {
      ref: 22,
      hero:  'assets/images/34/dacia-logan.webp',
      front: 'assets/images/cars/dacia-logan.webp',
      side:  'assets/images/side view/dacia-logan.webp'
    },
    'hyundai-accent': {
      ref: 24,
      hero:  'assets/images/34/hyundai-accent.webp',
      front: 'assets/images/cars/hyundai-accent.webp',
      side:  'assets/images/side view/hyundai-accent.webp'
    },
    'seat-leon': {
      ref: 27,
      hero:  'assets/images/34/seat-leon.webp',
      front: 'assets/images/cars/seat-leon.webp',
      side:  'assets/images/side view/seat-leon.webp'
    },
    'cupra-leon': {
      ref: 28,
      hero:  'assets/images/34/cupra-leon.webp',
      front: 'assets/images/cars/cupra-leon.webp',
      side:  'assets/images/side view/cupra-leon.webp'
    },
    'vw-golf-85': {
      ref: 29,
      hero:  'assets/images/34/vw-golf-85.webp',
      front: 'assets/images/cars/vw-golf-85.webp',
      side:  'assets/images/side view/vw-golf-85.webp',
      extra: ['assets/images/interior/vw-golf-85-1.webp']
    },
    'audi-a3': {
      ref: 30,
      hero:  'assets/images/34/audi-a3.webp',
      front: 'assets/images/cars/audi-a3.webp',
      side:  'assets/images/side view/audi-a3.webp'
    },
    'mercedes-classe-a': {
      ref: 31,
      hero:  'assets/images/34/mercedes-classe-a.webp',
      front: 'assets/images/cars/mercedes-classe-a.webp',
      side:  'assets/images/side view/mercedes-classe-a.webp'
    },
    'bmw-serie-1': {
      ref: 32,
      // No rear shot: the agency dropped it, so the gallery shows front + side.
      front: 'assets/images/cars/bmw-serie-1.webp',
      side:  'assets/images/side view/bmw-serie-1.webp'
    },
    'hyundai-tucson': {
      ref: 33,
      hero:  'assets/images/34/hyundai-tucson.webp',
      front: 'assets/images/cars/hyundai-tucson.webp',
      side:  'assets/images/side view/hyundai-tucson.webp'
    },
    'vw-tiguan': {
      ref: 36,
      hero:  'assets/images/34/vw-tiguan.webp',
      front: 'assets/images/cars/vw-tiguan.webp',
      side:  'assets/images/side view/vw-tiguan.webp'
    },
    'audi-rs3': {
      ref: 39,
      hero:  'assets/images/34/audi-rs3.webp',
      front: 'assets/images/cars/audi-rs3.webp',
      side:  'assets/images/side view/audi-rs3.webp'
    },
    'porsche-macan': {
      ref: 40,
      hero:  'assets/images/34/porsche-macan.webp',
      front: 'assets/images/cars/porsche-macan.webp',
      side:  'assets/images/side view/porsche-macan.webp'
    },
    'range-rover-sport': {
      ref: 41,
      hero:  'assets/images/34/range-rover-sport.webp',
      front: 'assets/images/cars/range-rover-sport.webp',
      side:  'assets/images/side view/range-rover-sport.webp'
    },
    'audi-q3': {
      ref: 24,
      hero:  'assets/images/34/audi-q3.webp',
      front: 'assets/images/cars/audi-q3.webp',
      side:  'assets/images/side view/audi-q3.webp',
      // photos supplémentaires (intérieur) : ajoutées à la suite dans la galerie
      extra: ['assets/images/interior/audi-q3-1.webp',
              'assets/images/interior/audi-q3-2.webp']
    },
    'vw-touareg': {
      ref: 42,
      hero:  'assets/images/34/vw-touareg.webp',
      front: 'assets/images/cars/vw-touareg.webp',
      side:  'assets/images/side view/vw-touareg.webp'
    },
    'hyundai-i10': {
      ref: 21,
      hero:  'assets/images/34/i10.webp',
      front: 'assets/images/cars/i10.webp',
      side:  'assets/images/side view/i10.webp'
    },
    'cupra-formentor': {
      ref: 38,
      hero:  'assets/images/34/cupra-formentor.webp',
      front: 'assets/images/cars/cupra-formentor.webp',
      side:  'assets/images/side view/cupra-formentor.webp'
    },
    'seat-ibiza': {
      ref: 26,
      hero:  'assets/images/34/seat-ibiza.webp',
      front: 'assets/images/cars/seat-ibiza.webp',
      side:  'assets/images/side view/seat-ibiza.webp'
    },
    'dacia-duster': {
      ref: 34,
      hero:  'assets/images/34/duster.webp',
      front: 'assets/images/cars/duster.webp',
      side:  'assets/images/side view/duster.webp'
    }
  };

  // Build a name → slug index (English names) for a secondary lookup.
  var NAME_TO_SLUG = {
    'toyota yaris':     'toyota-yaris',
    'renault clio':     'renault-clio',
    'dacia sandero':    'dacia-sandero',
    'peugeot 208':      'peugeot-208',
    'skoda octavia':    'skoda-octavia',
    'volkswagen t-roc': 'volkswagen-troc',
    'vw t-roc':         'volkswagen-troc',
    'hyundai i20':      'hyundai-i20',
    'kia sportage':     'kia-sportage',
    // Mêmes voitures que ci-dessus sous un autre nom (et un autre ref_id) en base.
    'renault clio 5 2025':       'renault-clio',
    'peugeot 208 hybride':       'peugeot-208',
    'audi q3 2026':              'audi-q3',
    'audi q3':                   'audi-q3',
    'volkswagen touareg 2025':   'vw-touareg',
    'vw touareg':                'vw-touareg',
    'hyundai i10':               'hyundai-i10',
    'cupra formentor 2025':      'cupra-formentor',
    'cupra formentor':           'cupra-formentor',
    'seat ibiza fr':             'seat-ibiza',
    'seat ibiza':                'seat-ibiza',
    'dacia duster':              'dacia-duster',
    'dacia duster automatique':  'dacia-duster',
    'opel corsa':                'opel-corsa',
    'dacia logan':               'dacia-logan',
    'hyundai accent 2025':       'hyundai-accent',
    'hyundai accent':            'hyundai-accent',
    'seat leon fr':              'seat-leon',
    'seat leon':                 'seat-leon',
    'cupra leon 2025':           'cupra-leon',
    'cupra leon':                'cupra-leon',
    'volkswagen golf 8.5 2026':  'vw-golf-85',
    'vw golf 8.5':               'vw-golf-85',
    'audi a3 2025':              'audi-a3',
    'audi a3':                   'audi-a3',
    'mercedes classe a':         'mercedes-classe-a',
    'bmw série 1 2026':          'bmw-serie-1',
    'bmw serie 1 2026':          'bmw-serie-1',
    'hyundai tucson':            'hyundai-tucson',
    'volkswagen tiguan 2025':    'vw-tiguan',
    'vw tiguan':                 'vw-tiguan',
    'audi rs3 2026':             'audi-rs3',
    'audi rs3':                  'audi-rs3',
    'porsche macan':             'porsche-macan',
    'range rover sport 2025':    'range-rover-sport',
    'range rover sport':         'range-rover-sport'
  };

  // Build a ref_id → entry index for the primary lookup.
  var REF_INDEX = {};
  Object.keys(CAR_IMAGES).forEach(function (slug) {
    var e = CAR_IMAGES[slug];
    if (e.ref != null) REF_INDEX[String(e.ref)] = e;
  });

  /**
   * Resolve a car's gallery photos. Tries ref_id first (stable across DB & static
   * data), then the car's English name. Returns null when no mapping exists so the
   * caller can fall back to the single Supabase photo_url.
   */
  function getCarImages(car) {
    if (!car) return null;
    if (car.ref_id != null && REF_INDEX[String(car.ref_id)]) {
      return REF_INDEX[String(car.ref_id)];
    }
    // Numeric `id` may also carry a ref in static fallbacks.
    if (car.id != null && REF_INDEX[String(car.id)]) {
      return REF_INDEX[String(car.id)];
    }
    var name = (car.name || '').trim().toLowerCase();
    if (name && NAME_TO_SLUG[name] && CAR_IMAGES[NAME_TO_SLUG[name]]) {
      return CAR_IMAGES[NAME_TO_SLUG[name]];
    }
    return null;
  }

  global.CAR_IMAGES = CAR_IMAGES;
  global.getCarImages = getCarImages;
})(window);
