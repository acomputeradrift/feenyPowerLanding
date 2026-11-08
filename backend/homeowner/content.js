// All homeowner landing-page copy lives here. One template renders every
// /{location}/{brand} page, so shared copy is written once and filled in with
// these tokens: {brand} {product} {region} {city} {price} {rate} {partner}.
// `**text**` renders as <strong>. Everything else is escaped as plain text.
//
// Rules for this copy: first person (Jamie), plain language, no false claims.
// Never say the diagnostic fee is credited toward repairs. Never promise a fixed
// repair price — the scope comes with a budget. Never mention HomeWorks.

export const SITE_URL = 'https://www.feenypowerandcontrol.com';
export const BUSINESS_NAME = 'Feeny Power and Control';
export const FOUNDER = 'Jamie Feeny';

export const locations = {
    vancouver: {
        slug: 'vancouver',
        region: 'Greater Vancouver',
        city: 'Vancouver',
        lang: 'en-CA',
        ogLocale: 'en_CA',
        currency: 'CAD',
        diagnosticPrice: 349,
        hourlyRate: 175,
        areaGroups: [
            {
                label: null,
                places: [
                    { name: 'Vancouver', parts: ['Point Grey', 'Kerrisdale', 'Shaughnessy', 'Dunbar', 'Kitsilano', 'Yaletown', 'Coal Harbour'] },
                    { name: 'West Vancouver' },
                    { name: 'North Vancouver' },
                    { name: 'Bowen Island' },
                    { name: 'Lions Bay' },
                    { name: 'Burnaby' },
                    { name: 'New Westminster' },
                    { name: 'Richmond' },
                    { name: 'Delta', parts: ['Tsawwassen', 'Ladner'] },
                    { name: 'Surrey' },
                    { name: 'Coquitlam' },
                    { name: 'Port Moody' },
                    { name: 'Port Coquitlam' },
                    { name: 'Anmore' },
                    { name: 'Belcarra' },
                    { name: 'Pitt Meadows' },
                ],
            },
        ],
        partner: {
            name: 'Blue Ember Solutions',
            logo: { src: '/images/blue-ember-logo.png', alt: 'Blue Ember Solutions', width: 400, height: 400 },
            note: 'When something needs hands onsite — {onsiteExamples}, a network sorted out — Blue Ember Solutions can do the physical work from my scope. They quote their own time and materials and contract with you directly.',
        },
        tie: 'I ran my own electrical contracting company in Vancouver for 10 years, so I know these homes and the systems in them.',
        // v2 layout: the contracting line lives in the trust strip and intro instead.
        v2: { tie: null, excludeAreas: ['Bowen Island'] },
    },
    kelowna: {
        slug: 'kelowna',
        region: 'Kelowna & the Central Okanagan',
        city: 'Kelowna',
        lang: 'en-CA',
        ogLocale: 'en_CA',
        currency: 'CAD',
        diagnosticPrice: 349,
        hourlyRate: 175,
        areaGroups: [
            {
                label: null,
                places: [
                    { name: 'Kelowna', parts: ['Lower Mission', 'Upper Mission', 'Kettle Valley', 'Glenmore', 'Dilworth', 'Black Mountain', 'McKinley'] },
                    { name: 'West Kelowna' },
                    { name: 'Westbank' },
                    { name: 'Lake Country', parts: ['Okanagan Centre', 'Winfield', "Carr's Landing"] },
                    { name: 'Peachland' },
                    { name: 'Joe Rich' },
                    { name: 'Ellison' },
                ],
            },
        ],
        partner: {
            name: 'VanReit Automation',
            logo: { src: '/images/vanreit-automation-logo.png', alt: 'VanReit Automation', width: 400, height: 400 },
            note: 'When something needs hands onsite — {onsiteExamples}, a network sorted out — VanReit Automation can do the physical work from my scope. They quote their own time and materials and contract with you directly.',
        },
        tie: 'I live in Kelowna half the year, so I’m often just down the road.',
        v2: { tie: null },
    },
    'los-gatos': {
        slug: 'los-gatos',
        region: 'Los Gatos, Silicon Valley & the Monterey Bay',
        city: 'Los Gatos',
        lang: 'en-US',
        ogLocale: 'en_US',
        currency: 'USD',
        diagnosticPrice: 249,
        hourlyRate: 125,
        areaGroups: [
            {
                label: 'Santa Clara County',
                places: [
                    { name: 'Los Gatos' },
                    { name: 'Monte Sereno' },
                    { name: 'Saratoga' },
                    { name: 'Los Altos' },
                    { name: 'Los Altos Hills' },
                    { name: 'Palo Alto' },
                    { name: 'Cupertino' },
                    { name: 'Campbell' },
                    { name: 'San Jose', parts: ['Almaden Valley', 'Willow Glen'] },
                    { name: 'Mountain View' },
                    { name: 'Sunnyvale' },
                    { name: 'Morgan Hill' },
                    { name: 'Gilroy' },
                ],
            },
            {
                label: 'San Mateo County',
                places: [
                    { name: 'Atherton' },
                    { name: 'Menlo Park' },
                    { name: 'Woodside' },
                    { name: 'Portola Valley' },
                    { name: 'Hillsborough' },
                ],
            },
            {
                label: 'Santa Cruz County',
                places: [
                    { name: 'Santa Cruz' },
                    { name: 'Scotts Valley' },
                    { name: 'Aptos' },
                    { name: 'Capitola' },
                    { name: 'Soquel' },
                    { name: 'Boulder Creek' },
                    { name: 'Ben Lomond' },
                    { name: 'La Selva Beach' },
                ],
            },
            {
                label: 'Monterey County',
                places: [
                    { name: 'Carmel-by-the-Sea' },
                    { name: 'Carmel Valley' },
                    { name: 'Pebble Beach' },
                    { name: 'Monterey' },
                    { name: 'Pacific Grove' },
                ],
            },
        ],
        partner: {
            name: 'Haven and Wire',
            logo: { src: '/images/haven-and-wire-logo.png', alt: 'Haven & Wire', width: 400, height: 400 },
            note: 'When something needs hands onsite — {onsiteExamples}, a network sorted out — Haven and Wire can do the physical work from my scope. They quote their own time and materials and contract with you directly.',
        },
        tie: 'I do all of Haven and Wire’s RTI programming, so we already work together every week.',
        v2: { tie: null },
    },
};

export const brands = {
    lutron: {
        slug: 'lutron',
        published: true,
        layout: 'v2',
        name: 'Lutron',
        product: 'Lutron RadioRA 2 & RadioRA 3',
        logo: { src: '/images/lutron-logo.png', alt: 'Lutron' },
        photo: { src: '/images/lutron-keypad-25.png', alt: 'Lutron keypad', width: 502, height: 800 },
        symptoms: [
            'Lights flicker or buzz since you switched to LED bulbs.',
            'The Lutron app stopped working after a new router or a change to your Wi-Fi.',
            'Keypad buttons do the wrong thing — or nothing at all.',
            'Schedules turn lights on and off at the wrong times.',
            'Your old dealer can’t or won’t transfer your RadioRA 3 project to you.',
        ],
        extras: [
            'A clear RadioRA 2 to RadioRA 3 upgrade path — staged over time if you prefer.',
            'Lutron Cloud project transfers — I contact Lutron and handle it for you.',
            'LED dimmer and lamp compatibility — sorting out flicker and buzz.',
        ],
        credential: null,
        connectOption: 'Lutron Cloud access for RadioRA 3 — if it’s still with your old dealer, I can contact Lutron for you to have it transferred.',
        connectFaq: ', or Lutron Cloud access for RadioRA 3',
        v2: {
            titleName: 'Lutron Lighting Control',
            testimonialFirst: 'Sean S, Vancouver Canada',
            problemIntro: 'A Lutron lighting control system is supposed to make life easier. Instead:',
            servicesHeading: 'What can I do for your Lutron lighting control system?',
            // Real scale: keypads in Designer wallplates are 4.69" tall, the Pico 2.6".
            equipmentStage: { width: 340, height: 290, caption: 'Lutron RadioRA 2, RadioRA 3 and Pico Remote' },
            equipment: [
                { at: [20, 10, 200], src: '/images/lutron-ra2-keypad-7-cutout.png', width: 378, height: 600, caption: 'Lutron RadioRA 2', alt: 'White Lutron RadioRA 2 keypad with seven engraved buttons: Welcome, Pathway, Entertain, Evening, Away, All On and All Off' },
                { at: [135, 50, 200], src: '/images/lutron-ra3-keypad-engraved-cutout.png', width: 375, height: 600, caption: 'Lutron RadioRA 3', alt: 'White Lutron RadioRA 3 keypad with four engraved buttons: Bright, Entertain, Relax and Nightlight' },
                { at: [250, 160, 111], src: '/images/lutron-pico-cutout.png', width: 295, height: 600, caption: 'Pico Remote', alt: 'White Lutron Pico remote with on, raise, favourite, lower and off buttons' },
            ],
            symptoms: [
                'Lights flicker or buzz since you switched to LED bulbs.',
                'The Lutron app stopped working after a new router or a change to your Wi-Fi.',
                'Keypad buttons are not programmed the way you want.',
                'Schedules turn lights on and off at the wrong times.',
                'Keypad engraving is half done or not done at all.',
            ],
            services: {
                replace: {
                    troubleshooting: 'Troubleshooting — including LED flicker, buzz and dimmer compatibility.',
                    devices: 'Adding or replacing system devices — processors, dimmers, switches, keypads and Pico remotes.',
                    upgrades: 'Upgrades and migrations, including a clear RadioRA 2 to RadioRA 3 upgrade path — staged over time if you prefer.',
                },
                add: [
                    'Lutron Cloud project transfers — I contact Lutron and handle it for you.',
                ],
            },
        },
        fileNote: 'For RadioRA 3, I can contact Lutron for you to have the project transferred. Otherwise, depending on the system, I can recover the existing programming or rebuild it.',
    },
    vantage: {
        slug: 'vantage',
        published: true,
        layout: 'v2',
        name: 'Vantage',
        product: 'Vantage lighting control',
        logo: { src: '/images/vantage-logo.png', alt: 'Vantage' },
        photo: { src: '/images/vantage-keypad-25.png', alt: 'Vantage keypad', width: 491, height: 800 },
        symptoms: [
            'Keypads or scenes stopped responding.',
            'Things stopped working after a network or internet change.',
            'The Vantage app or touchscreen won’t connect.',
            'The person who programmed it can’t be reached.',
            'You’d like scenes or schedules changed, but nobody can do it.',
            'Your controller is getting old and you’re not sure what happens when it fails.',
        ],
        extras: [
            'An honest upgrade path for older Vantage controllers.',
            'Getting the Vantage app and touchscreens talking to your system again.',
        ],
        credential: null,
        connectOption: null,
        hardwareDevices: 'dimmer, keypad, touchscreen, power module, controller or network device',
        fileNote: 'Depending on the system, I can recover the existing programming or rebuild it.',
        v2: {
            titleName: 'Vantage Lighting Control',
            testimonialFirst: 'Morgan M, Vancouver Canada',
            problemIntro: 'A Vantage lighting control system is supposed to make life easier. Instead:',
            servicesHeading: 'What can I do for your Vantage lighting control system?',
            // Real scale: 1-gang keypad wallplates are 4.62" tall, the Equinox 41 4.9".
            equipmentStage: { width: 340, height: 290, caption: 'Vantage RP-Touch, EasyTouch II and Equinox 41' },
            equipment: [
                { at: [0, 0, 200], src: '/images/vantage-rp-keypad-cutout.png', width: 375, height: 600, caption: 'Vantage RP-Touch', alt: 'White Vantage RP-Touch keypad with eight engraved buttons: Home, Sconces, Pathway, Lamps, Accent, Rope LED, Garden and Away' },
                { at: [100, 39, 200], src: '/images/vantage-easytouch-keypad-cutout.png', width: 373, height: 600, caption: 'Vantage EasyTouch II', alt: 'White Vantage EasyTouch II keypad with five engraved buttons: Home, Pathway, Accent, Garden and Away' },
                { at: [193, 78, 212], src: '/images/vantage-eq41-touchscreen-cutout.png', width: 416, height: 600, caption: 'Vantage Equinox 41', alt: 'Black Vantage Equinox 41 wall screen showing climate, scenes and music controls' },
            ],
            symptoms: [
                'Lights flicker or buzz since you switched to LED bulbs.',
                'The Vantage app or touchscreen stopped working after a new router or a change to your Wi-Fi.',
                'Keypad buttons are not programmed the way you want.',
                'Schedules turn lights on and off at the wrong times.',
                'Keypad engraving is half done or not done at all.',
            ],
            services: {
                replace: {
                    troubleshooting: 'Troubleshooting — including LED flicker, buzz and dimmer compatibility.',
                    changes: 'Scene, button, timer and touchscreen changes.',
                    devices: 'Adding or replacing system devices — InFusion controllers, power modules, dimmers, keypads and touchscreens.',
                    upgrades: 'Upgrades and migrations, including a clear upgrade path for older Vantage controllers — staged over time if you prefer.',
                },
            },
        },
    },
    rti: {
        slug: 'rti',
        published: true,
        layout: 'v2',
        name: 'RTI',
        product: 'RTI control system',
        logo: { src: '/images/rti-logo-bigger.png', alt: 'RTI' },
        photo: { src: '/images/rti-panel-50.png', alt: 'RTI touchscreen panel', width: 1018, height: 938 },
        symptoms: [
            'Handheld remotes stopped working.',
            'Devices stopped responding after a network change.',
            'Certain speakers won’t play.',
            'The TV won’t turn on.',
            'Lights or shades don’t work from the remote or touchscreen.',
            'Anything else the system controls is acting up.',
        ],
        extras: [
            'A custom iPhone and iPad app for your RTI system.',
            'Remote and touchscreen redesign — layouts everyone in the house can use.',
        ],
        credential: null,
        connectOption: null,
        hardwareDevices: 'remote, touchscreen, processor, audio/video component or other network device',
        onsiteExamples: 'a touchscreen swapped, a processor replaced',
        localTrade: 'AV technician',
        v2: {
            titleName: 'RTI Control System',
            testimonialFirst: 'Bob G, Whistler Canada',
            problemIntro: 'An RTI control system is supposed to make life easier. Instead:',
            servicesHeading: 'What can I do for your RTI control system?',
            // Remotes to real scale with each other (T2x 10.0", T4x 8.3"); the KA11 is not.
            equipmentStage: { width: 340, height: 290, caption: 'RTI KA11, T4x and T2x' },
            equipment: [
                { at: [0, 10, 190], src: '/images/rti-ka11-white-cutout.png', width: 933, height: 600, caption: 'RTI KA11', alt: 'White RTI KA11 touchscreen showing the Family Room home page with weather and a music player' },
                { at: [280, 70, 210], src: '/images/rti-t2x-cutout.png', width: 136, height: 600, caption: 'RTI T2x', alt: 'Black RTI T2x handheld remote with a colour screen showing Family Room sources: Apple TV, Blu-ray, Movie Server and Fire TV' },
                { at: [216, 106, 174], src: '/images/rti-t4x-cutout.png', width: 169, height: 600, caption: 'RTI T4x', alt: 'Black RTI T4x handheld remote with a large screen showing Theater Room sources: Apple TV, Blu-ray, Movie Server, Cable TV and Fire TV' },
            ],
            symptoms: [
                'The handheld remote stopped working, or only works some of the time.',
                'Things stopped responding after a new router or a change to your network.',
                'You used to have an RTI app on your phone or iPad, but it doesn’t load anymore.',
                'Music won’t play in some rooms.',
                'Lights or shades don’t work from the remote or touchscreen.',
                'Buttons on the remote or touchscreen aren’t set up the way you want.',
            ],
            services: {
                replace: {
                    troubleshooting: 'Troubleshooting — including remotes that stop responding and network problems.',
                    changes: 'Button, scene and activity changes on your remotes, touchscreens and keypads.',
                    engraving: 'Modify or add scheduled events to your system.',
                    devices: 'Adding or replacing system devices — processors, handheld remotes, touchscreens and keypads.',
                    integrations: 'Integrations with your lighting, shades, music, TVs, security and climate.',
                    apps: 'Remote and touchscreen redesign — layouts everyone in the house can use.',
                },
                add: [
                    'A custom RTI app for your iPhone and iPad.',
                ],
            },
        },
        fileNote: 'Depending on the system, I can recover the existing programming or rebuild it.',
    },
    'clipsal-c-bus': {
        slug: 'clipsal-c-bus',
        published: true,
        layout: 'v2',
        name: 'Clipsal C-Bus',
        product: 'Clipsal C-Bus control system',
        diagnosticPrice: { CAD: 499 },
        logo: { src: '/images/clipsal-logo.png', alt: 'Clipsal by Schneider Electric', width: 600, height: 154 },
        photo: null,
        symptoms: [
            'Lights or scenes aren’t responding.',
            'Keypads are dead or doing the wrong thing.',
            'Nobody local knows C-Bus — or wants to touch it.',
            'You want changes or additions, but can’t find anyone to program them.',
            'You’re wondering what the upgrade path looks like for an older system.',
        ],
        extras: [
            'Changes and additions to existing C-Bus networks.',
            'An honest upgrade path when you’re ready to plan ahead.',
        ],
        credential: 'I was actually one of the only trained Clipsal C-Bus installers in Canada while Clipsal sold C-Bus here, and I still maintain several C-Bus systems today.',
        connectOption: null,
        hardwareDevices: 'dimmer or relay module, power supply, keypad, sensor, thermostat or network device',
        fileNote: 'Depending on the system, I can recover the existing programming or rebuild it.',
        v2: {
            titleName: 'Clipsal C-Bus Control System',
            testimonialFirst: 'Morgan M, Vancouver Canada',
            problemIntro: 'A Clipsal C-Bus control system is supposed to make life easier. Instead:',
            servicesHeading: 'What can I do for your Clipsal C-Bus control system?',
            // Real scale: Saturn plates are 116 mm tall, the thermostat 92 × 127 mm.
            equipmentStage: { width: 340, height: 340, caption: 'Clipsal C-Bus Saturn, Saturn DLT and thermostat' },
            equipment: [
                { at: [0, 0, 200], src: '/images/clipsal-saturn-keypad-cutout.png', width: 372, height: 600, caption: 'Clipsal C-Bus Saturn', alt: 'Cream glass Clipsal C-Bus Saturn keypad with six round chrome buttons' },
                { at: [104, 28, 200], src: '/images/clipsal-saturn-dlt-cutout.png', width: 385, height: 600, caption: 'Clipsal C-Bus Saturn DLT', alt: 'Stainless steel Clipsal C-Bus Saturn DLT keypad with an LCD label panel and five buttons' },
                { at: [120, 181, 159], src: '/images/clipsal-thermostat-cutout.png', width: 829, height: 600, caption: 'Clipsal C-Bus thermostat', alt: 'Clipsal C-Bus thermostat with a glass front, LCD screen and five buttons' },
            ],
            symptoms: [
                'Lights or scenes aren’t responding, or only work some of the time.',
                'Keypad buttons are not programmed the way you want.',
                'The labels on your Saturn DLT keypads are wrong or blank.',
                'Schedules turn lights on and off at the wrong times.',
                'Lights flicker or buzz since you switched to LED bulbs.',
                'Your Wiser or C-Bus app stopped working after a new router or a change to your network.',
                'Nobody local knows C-Bus, or wants to touch it.',
            ],
            services: {
                replace: {
                    troubleshooting: 'Troubleshooting — including LED flicker, buzz and dimmer compatibility.',
                    changes: 'Scene, button and schedule changes.',
                    engraving: 'New keypad engraving and DLT labels — I coordinate it.',
                    devices: 'Adding or replacing system devices — dimmer and relay modules, power supplies, Saturn and DLT keypads, sensors and thermostats.',
                    upgrades: 'Upgrades and migrations, including a clear upgrade path for older C-Bus systems — staged over time if you prefer.',
                },
            },
        },
    },
};

export const pages = [
    { location: 'vancouver', brand: 'lutron' },
    { location: 'vancouver', brand: 'vantage' },
    { location: 'vancouver', brand: 'rti' },
    { location: 'vancouver', brand: 'clipsal-c-bus' },
    { location: 'kelowna', brand: 'lutron' },
    { location: 'kelowna', brand: 'vantage' },
    { location: 'kelowna', brand: 'rti' },
    { location: 'kelowna', brand: 'clipsal-c-bus' },
    { location: 'los-gatos', brand: 'lutron' },
    { location: 'los-gatos', brand: 'rti' },
];

// Live pages. A brand goes live with `published: true` once Jamie approves it;
// drafts 404 unless HOMEOWNER_SHOW_DRAFTS=true (local .env only).
export const publishedPages = pages.filter((p) => brands[p.brand].published);

// Order of brand checkboxes in the form (the page's own brand moves first).
export const formBrandOrder = ['lutron', 'vantage', 'rti', 'clipsal-c-bus'];

export const shared = {
    seo: {
        title: '{brand} Programming & Repair, {city} | Feeny Power',
        titleShort: '{brand} Programming & Repair, {city}',
        description: 'Remote {brand} troubleshooting & programming for {city} homeowners. {price} fixed-price diagnostic, diagnosis in 48 hours. You own the file.',
        descriptionShort: 'Remote {brand} troubleshooting & programming in {city}. {price} fixed-price diagnostic, diagnosis in 48 hours.',
    },

    hero: {
        headline: 'Get your {brand} system working again',
        headlineTail: '— without chasing the installer who disappeared.',
        subhead: 'Remote {product} programming & troubleshooting for homeowners in {region}.',
        primaryCta: 'Book a remote diagnostic',
        secondaryCta: 'How it works',
        microline: 'Replies usually within an hour · Diagnosis within 48 hours',
    },

    trust: {
        label: 'Why homeowners trust me',
        items: [
            { lead: 'Authorized dealer', text: 'Manufacturer-trained on Lutron, Vantage, RTI and Clipsal C-Bus.' },
            { lead: '10 years', text: 'running a Vancouver custom-home electrical contracting company specializing in smart home tech.' },
            { lead: 'Hundreds', text: 'of systems programmed.' },
            { lead: 'Remote work', text: 'in Whistler, Barbados, Israel, Australia and across the US.' },
        ],
    },

    problem: {
        heading: 'Sound familiar?',
        intro: 'Your {brand} system was supposed to make life easier. Instead:',
        agitateHeading: 'And getting it fixed is its own headache.',
        agitate: [
            'The person who programmed it has moved on and isn’t returning calls.',
            'The dealer has your project file and won’t hand it over.',
            'Local integrators want to rip it out and sell you a new system — or they never call back.',
        ],
        closing: 'So you live with a half-working system you paid a lot of money for. It doesn’t have to stay that way.',
    },

    solution: {
        heading: 'A remote specialist who works with what you already have',
        body: [
            'I’m Jamie Feeny. I program and troubleshoot {brand} systems remotely — for homeowners, and for the integrators who install them.',
            'I work with your existing system, not against it, and with whoever is onsite — my local partner or your own {localTrade}. No rip-and-replace sales pitch. No disappearing act.',
        ],
    },

    benefits: {
        heading: 'What you get',
        cards: [
            {
                lead: 'Fixed-price',
                rest: 'diagnosis, clear budget',
                text: 'The diagnostic is a flat **{price}** — no open-ended service calls. You get a written scope with specific deliverables and a budget at {rate}, so you know where you stand before any repair work starts.',
            },
            {
                lead: 'You own',
                rest: 'your system',
                text: 'At handover you get your project file and documentation. If anyone else ever needs to work on it, they’ll have everything they need. You’ll never be locked out again.',
            },
            {
                lead: 'Local hands',
                rest: 'when needed',
                text: 'If something physical needs doing, my partner tech in {region} — or your own {localTrade} — handles it, working from my scope.',
            },
        ],
    },

    services: {
        heading: 'What I can do for your {brand} system',
        items: [
            'Troubleshooting and repair.',
            'Scene, schedule, timeclock and button changes.',
            'New keypad engraving and labels — I coordinate it.',
            'Adding or replacing devices, dimmers, keypads and remotes.',
            'Recovering or rebuilding lost project files.',
            'Upgrades and migrations, with a clear upgrade path for older gear.',
            'Integrations with Sonos, HomeKit, Alexa, Google, shades and HVAC — where your system supports them.',
            'Documentation and a proper handover.',
            'App, remote and touchscreen setup or redesign.',
        ],
        extrasHeading: 'Especially for {brand}',
    },

    steps: {
        heading: 'How it works',
        items: [
            {
                title: 'Tell me what’s wrong',
                body: 'Fill in the 2-minute form below. I usually reply within an hour (unless I’m out surfing or running).',
            },
            {
                title: 'Connect me to your system',
                body: 'You’ll need to be home for the first session. I can connect a few ways:',
                options: [
                    'A VPN — I can set one up for you on Ubiquiti networks.',
                    '{connectOption}',
                    'Chrome Remote Desktop or AnyDesk on a laptop at home.',
                    'Or simply send me your project file.',
                ],
            },
            {
                title: 'Fixed-price diagnostic: {price}',
                body: 'Within 48 hours of receiving your project file or remote access, you get a diagnosis and a scope document with specific deliverables and a budget at {rate}. If I can fix it within the diagnostic price, I just fix it.',
            },
            {
                title: 'The fix',
                body: 'I do the programming remotely. If something physical needs doing, my local partner tech handles it — they quote their own time and materials and contract with you directly, working from my scope. Or your own {localTrade} or integrator can do it.',
            },
            {
                title: 'Handover',
                body: 'You receive your project file and documentation. It’s your system — you’ll never be locked out again.',
            },
        ],
    },

    guarantee: {
        heading: 'My guarantee',
        text: 'If I can’t diagnose it, you don’t pay the diagnostic fee.',
    },

    local: {
        heading: 'Serving {region}',
        intro: 'I do the programming remotely, and I have local help for anything that needs hands onsite across:',
        partnerHeading: 'My local partner: {partner}',
    },

    testimonials: {
        heading: 'Trusted by integrators',
        intro: 'Before homeowners, I’ve spent years programming systems for the integrators who install them. Here’s what two of them say.',
        items: [
            {
                quote: 'I contacted Jamie Feeny from Feeny Power through Facebook and within a few days he was helping me remotely with some RTI programming. … Despite the time difference between Australia and Canada, Jamie was incredibly accommodating and made himself available when needed. My small project was completed in just a few hours thanks to his expertise and efficient approach. I wouldn\'t hesitate to recommend Jamie to anyone needing RTI programming assistance or technical support. …',
                name: 'Daniel',
                company: 'The Home Automation Store, Sydney Australia',
            },
            {
                quote: 'I highly recommend Jamie Feeny of Feeny Power and Control Ltd. for Lutron and RTI programming and home automation. Jamie has an exceptional understanding of both Lutron lighting control and RTI automation systems. … We’ve worked with Jamie on programming and commissioning systems, and he consistently delivers reliable, well-thought-out solutions. … Whether it’s a new system, troubleshooting an existing installation, or working through a complicated integration, I wouldn’t hesitate to recommend Jamie and Feeny Power and Control Ltd. for Lutron, RTI, and home automation programming.',
                name: 'Morgan McMillan',
                company: 'Blue Ember Solutions, Vancouver Canada',
            },
        ],
    },

    faq: {
        heading: 'Questions homeowners ask',
        items: [
            {
                q: 'What does it cost?',
                a: 'It starts with a fixed-price diagnostic: {price}. I find out what’s wrong and send you a scope document listing the specific deliverables, with a budget based on my hourly rate of {rate}. You decide whether to go ahead. Small fixes are often done within the diagnostic itself — if I can fix it within the diagnostic price, I just fix it.',
            },
            {
                q: 'What if it’s a hardware problem?',
                a: 'I can usually pinpoint a failed {hardwareDevices} remotely. My local partner or your own {localTrade} replaces it, and I program the new device.',
            },
            {
                q: 'Will I lose my scenes and settings?',
                a: 'The goal is always to preserve what you have. Before I change anything, I document your existing programming so there’s a record to go back to.',
            },
            {
                q: 'My installer has the project file and won’t respond. Can you still help?',
                a: 'Usually, yes. {fileNote} Either way, when we’re done, you own the file.',
            },
            {
                q: 'Is my old system worth fixing, or should I upgrade?',
                a: 'Often it’s fixable, and I’ll tell you honestly if it isn’t. If an upgrade makes sense, I’ll lay out a clear upgrade path — and it can be staged over time so you’re not replacing everything at once.',
            },
            {
                q: 'Do I need to be home? How do you connect?',
                a: 'For the first session, yes — someone needs to be home to get me connected. After that I work remotely, through a VPN (I can set one up on Ubiquiti networks), Chrome Remote Desktop or AnyDesk on a laptop at home{connectFaq}. You can also just send me the project file.',
            },
            {
                q: 'How fast can you help?',
                a: 'I usually reply within an hour (unless I’m out surfing or running). Once I have your project file or remote access, you’ll have a diagnosis within 48 hours.',
            },
            {
                q: 'Do I need someone onsite?',
                a: 'Only for physical work, like replacing a device or fixing network hardware. My local partner, {partner}, can handle it — they quote and contract with you directly — or your own {localTrade} or integrator can. Either way, they work from my scope and I do the programming remotely.',
            },
        ],
    },

    finalCta: {
        heading: 'Let’s get your {brand} system working again',
        text: 'Tell me what’s going on. I usually reply within an hour, and you’ll have a diagnosis within 48 hours of getting me your project file or remote access.',
    },

    form: {
        ariaLabel: 'Book a remote diagnostic',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        city: 'City',
        brands: 'Which systems do you have?',
        problem: 'Describe the problem',
        problemHint: 'What’s not working, and when did it start?',
        hasFile: 'Do you have (or can you get) the current project file?',
        yes: 'Yes',
        no: 'No',
        submit: 'Book a remote diagnostic',
        sending: 'Sending…',
        success: 'Thanks — I’ll reply shortly, usually within the hour.',
        error: 'Sorry, something went wrong sending your message. Please check the form and try again in a moment.',
    },

    footer: {
        copyright: '© 2026 Feeny Power and Control Ltd. All Rights Reserved.',
        integratorLink: 'For integrators & dealers',
    },
};

// Layout v2 — approved on the Lutron pages 2026-11-07. A brand opts in with
// `layout: 'v2'` and supplies `v2.symptoms` (and optionally `v2.services`,
// `v2.servicesHeading`, `v2.titleName` for the page title and `v2.equipment`
// photos beside the symptoms).
// A location may supply `v2.tie` and `v2.excludeAreas`. Rendered by
// frontend/homeowner/service_v2.html. Anything not overridden here comes from `shared`.
// v2 copy never says "repair".
export const sharedV2 = {
    ...shared,

    // JSON-LD business name; v1 uses BUSINESS_NAME.
    businessName: 'Feeny Power and Control Ltd.',

    seo: {
        ...shared.seo,
        title: '{titleName} Troubleshooting | {city}',
        titleShort: '{titleName} Troubleshooting | {city}',
        description: 'Remote {brand} troubleshooting & programming for {city} homeowners. {price} fixed-price diagnosis.',
        descriptionShort: 'Remote {brand} troubleshooting & programming in {city}. {price} fixed-price diagnosis.',
    },

    hero: {
        ...shared.hero,
        primaryCta: 'Fix my {brand} system',
        microline: 'You will get a reply within 24 hours.',
    },

    trust: {
        ...shared.trust,
        items: shared.trust.items.map((item) =>
            (item.lead === 'Remote work' ? { ...item, text: 'with clients in 5 countries and counting!' } : item)),
    },

    // A quote may be an array of paragraphs. Names read "First L, City Country".
    testimonials: {
        heading: 'What clients say',
        items: [
            {
                quote: 'Jamie is a professional and was a pleasure to work with. The system he sourced and installed for me went above and beyond my expectations… I highly recommend him.',
                name: 'Lisa P, Kelowna Canada',
            },
            {
                quote: 'Jamie was great to work with. My house is in a remote location where there are no RTI programmers. Jamie would log on to my system remotely to make changes or other times he walked me through processes over the phone and it was easy troubleshooting problems together. Jamie knows his systems well and it’s always easy working with him. I have no issues recommending him to whoever may need his services.',
                name: 'Bob G, Whistler Canada',
            },
            {
                quote: 'I had a fantastic experience working with Jamie Feeny and his team for all our Lutron programming needs. Their technical expertise is exceptional… They are professional, efficient, and took the time to ensure everything was functioning flawlessly before wrapping up. Lutron Radio Ra automation has completely transformed many homes, and I couldn\'t be happier with the results from Jamie\'s team. If you are looking for top-tier Lutron programming company, I highly recommend their services!',
                name: 'Sean S, Vancouver Canada',
            },
            {
                quote: 'I am very picky with who I work with as I have very high standards. Jamie meets those standards, is a true professional and more so, is a great person.',
                name: 'Chris C, Vancouver Canada',
            },
            {
                quote: [
                    'We worked with Jamie Feeny as our Lutron programmer on a very large HomeWorks lighting and shading system for a large estate. There was limited documentation to work from, and Jamie took it on independently. He thought outside the box and made sound decisions without needing to be walked through each one.',
                    'If you need a programmer who can work independently and leave behind a file that others can actually work with, we’d recommend Jamie without hesitation.',
                ],
                name: 'Brad K, Vancouver Canada',
            },
            { quote: shared.testimonials.items.find((q) => q.name === 'Morgan McMillan').quote, name: 'Morgan M, Vancouver Canada' },
            { quote: shared.testimonials.items.find((q) => q.name === 'Daniel').quote, name: 'Daniel T, Sydney Australia' },
        ],
    },

    problem: {
        ...shared.problem,
        intro: 'A {brand} system is supposed to make life easier. Instead:',
        agitate: [
            'The person who programmed it has moved on or is unavailable.',
            'Getting another company to return your calls and show up is a hassle.',
            'Companies that did show up want to sell you a bunch of new equipment.',
            'The original dealer has your project file and won’t hand it over.',
            'You just bought the house and don’t know who the original installer was.',
        ],
    },

    solution: {
        heading: 'Who am I?',
        body: [
            'I’m Jamie Feeny. Not only did I run a custom-home electrical contracting company in Vancouver for 10 years, specializing in smart home technology, but I also have:',
            {
                list: [
                    '16 years of experience with Lutron',
                    '16 years with RTI',
                    'Over a decade of experience with Vantage and Clipsal C-Bus',
                ],
            },
            'Since 2017 I’ve focused on programming control systems, and since COVID I’ve done that work remotely.',
            'I’m an authorized dealer for Lutron, Vantage, RTI and Clipsal C-Bus, which means I’ve completed each manufacturer’s training.{credential} Through these brands, I’ve programmed hundreds of systems, including remote jobs in Whistler, Barbados, Israel, Australia and across the US.',
            'I work with the system you already have, not against it, and with whoever is onsite — my local partner or your own {localTrade}. No rip-and-replace sales pitch. No disappearing act.',
        ],
    },

    benefits: {
        ...shared.benefits,
        cards: shared.benefits.cards.map((card) => ({
            ...card,
            lead: card.lead === 'Local hands' ? 'Local help' : card.lead,
            text: card.text
                .replace('before any repair work starts', 'before any work starts')
                .replace('a budget at {rate}', 'a budget to complete the work')
                .replace('If something physical needs doing', 'If something needs to be installed or replaced'),
        })),
    },

    // One list; brands replace items by key or add their own (v2.services).
    services: {
        heading: shared.services.heading,
        items: [
            { key: 'troubleshooting', text: 'Troubleshooting.' },
            { key: 'changes', text: 'Scene, schedule, timeclock and button changes.' },
            { key: 'engraving', text: 'New keypad engraving and labels — I coordinate it.' },
            { key: 'devices', text: 'Adding or replacing devices, dimmers, keypads and remotes.' },
            { key: 'files', text: 'Recovering or rebuilding lost project files.' },
            { key: 'upgrades', text: 'Upgrades and migrations, with a clear upgrade path for older gear.' },
            { key: 'integrations', text: 'Integrations with 3rd party systems.' },
            { key: 'documentation', text: 'Documentation and a proper handover.' },
            { key: 'apps', text: 'iPhone, iPad or Android app setup.' },
        ],
    },

    steps: {
        heading: shared.steps.heading,
        items: shared.steps.items.map((step, i) => {
            if (i === 0) return { ...step, body: 'Fill in the 2-minute form below. I will reply within 24 hours.' };
            if (i === 2) return { ...step, body: 'Within 48 hours of receiving your project file, you get a diagnosis and a scope document with specific deliverables and a budget. If I can fix it within the diagnostic price, I just fix it.' };
            if (i === 3) return { ...step, body: step.body.replace('I do the programming remotely.', 'I do the programming and testing remotely.') };
            return step;
        }),
    },

    local: {
        ...shared.local,
        intro: 'I do the programming and testing remotely, and I have trusted local help for anything that needs to be done onsite across:',
    },

    faq: {
        heading: 'Questions you may have',
        items: shared.faq.items.flatMap((item) => {
            if (item.q === 'How fast can you help?') {
                return { ...item, a: 'I will reply within 24 hours. Once I have your project file, you’ll have a diagnosis within 48 hours.' };
            }
            if (item.q === 'Do I need to be home? How do you connect?') {
                return [
                    {
                        q: 'How do you connect to my system to complete the work?',
                        a: 'I work remotely, through a VPN (I can set one up on Ubiquiti networks), Chrome Remote Desktop or AnyDesk on a laptop at home{connectFaq}.',
                    },
                    {
                        q: 'Do I need to be home, or have someone onsite?',
                        a: 'For the first session, yes — someone needs to be home to get me connected and test with me. If you’d rather not do the testing yourself, my local partner, {partner}, can be there for it. Physical work, like replacing a device or fixing network hardware, is handled by {partner} — they quote and contract with you directly — or your own {localTrade}. Either way, they work from my scope and I do the programming and testing remotely.',
                    },
                ];
            }
            if (item.q === 'Do I need someone onsite?') return [];
            return {
                ...item,
                a: item.a
                    .replace('I do the programming remotely', 'I do the programming and testing remotely')
                    .replace('a budget based on my hourly rate of {rate}', 'a budget to complete the work'),
            };
        }),
    },

    finalCta: {
        ...shared.finalCta,
        text: 'Tell me what’s going on. I will reply within 24 hours, and you’ll have a diagnosis within 48 hours of getting me your project file.',
    },

    form: {
        ...shared.form,
        ariaLabel: 'Tell me what’s wrong',
        submit: 'Send it!',
        submitNote: 'You will get a reply within 24 hours.',
        success: 'Thanks — I’ll reply within 24 hours.',
    },

    stickyCta: {
        label: 'Fix my {brand} system',
    },
};
