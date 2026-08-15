/*
  MTSC Range Timer — built-in course-of-fire library
  ================================================
  Schema (also used by the in-app Course of Fire editor — see editor.js):

  Competition {
    id: string (unique, url-safe)
    name: string              e.g. "GR1500"
    code: string              short code shown in lists
    summary: {
      distances: string       e.g. "10, 15, 25 & 50 metres"
      rounds: number|string   rounds required
      maxScore: string
      duration: string        estimated time to complete
      notes: string           free text (sighters info, hand use, etc.)
    }
    rangeCommands: string[]   the RO's spoken script, shown as a reference
                               panel and walked through before the first detail
    extraNote: string?        optional footnote (e.g. shotgun clearing command)
    details: Detail[]
  }

  Detail {
    id: string (unique within competition)
    match: string             e.g. "Match 1"
    practice: string?         e.g. "Practice 1" (optional)
    distance: string          e.g. "25 metres"
    startPosition: string
    description: string       human-readable summary of the course of fire
    loadCommand: string?      override of the competition's default load
                               command, when a detail uses a different one
                               (e.g. "load and DO NOT make ready!")
    timing: Timing
    repeatCount: number       how many times this detail is shot end-to-end
                               (default 1; e.g. 2 for "detail to be shot twice")
    scoreChangeAfter: boolean whether a "Score & Change Targets" pause is
                               shown after this detail completes
  }

  Timing (discriminated union on `type`):

    Single string / sighters:
    {
      type: "single",
      isSighters: boolean?    true = open/unlimited-fire countdown (no stop
                               beep implies "cease fire" rather than a shot
                               deadline, but the app still beeps at 0)
      durationOptions: [{ label: string, seconds: number }]
                               usually one option; more than one lets the RO
                               pick the applicable variant at run time
                               (e.g. GRSB 20s vs GRCF 30s)
    }

    Turning-target / appearances sequence:
    {
      type: "appearances",
      strings: number             number of separate strings (each gets its
                                   own Standby -> beep sequence)
      appearancesPerString: number
      exposureSeconds: number     target-up duration, beep-in / beep-out
      intervalSeconds: number     target-down duration between appearances
      shotsPerAppearance: number  informational, shown on screen
    }
*/

const BUILTIN_COMPETITIONS = [
  {
    id: "precision25",
    name: "25m Precision",
    code: "25P",
    summary: {
      distances: "25 metres",
      rounds: 30,
      maxScore: "300.030",
      duration: "approx. 30 minutes",
      notes: "Includes a sighters detail with unlimited sighters permitted in the time frame. Two hands may be used for all details except Single Handed Smallbore Pistol (SSBP25P). Spotting scopes are permitted. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase, unholster, and take a sight picture…",
      "With the required number of rounds, load and make ready!…",
      "Is the line ready?",
      "The line is ready!",
      "Standby!…"
    ],
    details: [
      {
        id: "precision25-sighters",
        match: "Sighters", practice: null,
        distance: "25 metres", startPosition: "45 degrees",
        description: "Unlimited sighters",
        timing: { type: "single", isSighters: true, durationOptions: [{ label: "Sighters", seconds: 180 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "precision25-m1",
        match: "Match 1", practice: null,
        distance: "25 metres", startPosition: "45 degrees",
        description: "10 shots in 3 minutes",
        timing: { type: "single", durationOptions: [{ label: "Match 1", seconds: 180 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "precision25-m2",
        match: "Match 2", practice: null,
        distance: "25 metres", startPosition: "45 degrees",
        description: "10 shots in 3 minutes",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 180 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "precision25-m3",
        match: "Match 3", practice: null,
        distance: "25 metres", startPosition: "45 degrees",
        description: "10 shots in 3 minutes",
        timing: { type: "single", durationOptions: [{ label: "Match 3", seconds: 180 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "tp1",
    name: "Timed & Precision 1",
    code: "TP1",
    summary: {
      distances: "25, 15 & 10 metres",
      rounds: 30,
      maxScore: "300.030",
      duration: "approx. 30 minutes",
      notes: "No sighters detail. Two hands may be used for all details. Only one target to be hung at a time. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase, unholster, and take a sight picture…",
      "With 6 rounds, load and make ready!…",
      "Is the line ready?",
      "The line is ready!",
      "Standby!…"
    ],
    extraNote: "When clearing Target Shotgun — ensure you can see the magazine follower — the command is \"Flag and Bag\" (insert a breech flag before casing the firearm).",
    details: [
      {
        id: "tp1-m1",
        match: "Match 1", practice: null,
        distance: "25 metres", startPosition: "45 degrees",
        description: "12 shots in 2 minutes, to include a reload",
        timing: { type: "single", durationOptions: [{ label: "Match 1", seconds: 120 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "tp1-m2",
        match: "Match 2", practice: null,
        distance: "15 metres", startPosition: "45 degrees",
        description: "12 shots in two strings of 6. One shot to be fired at each appearance. The firearm must return to the ready position between appearances.",
        timing: { type: "appearances", strings: 2, appearancesPerString: 6, exposureSeconds: 2, intervalSeconds: 5, shotsPerAppearance: 1 },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "tp1-m3",
        match: "Match 3", practice: null,
        distance: "10 metres", startPosition: "45 degrees",
        description: "6 shots total. Two shots to be fired at each appearance. The firearm must return to the ready position between appearances.",
        timing: { type: "appearances", strings: 1, appearancesPerString: 3, exposureSeconds: 3, intervalSeconds: 5, shotsPerAppearance: 2 },
        repeatCount: 1, scoreChangeAfter: true
      }
    ]
  },

  {
    id: "multitarget",
    name: "Multi Target",
    code: "MT",
    summary: {
      distances: "25, 20, 15 & 10 metres",
      rounds: 24,
      maxScore: "120.024",
      duration: "approx. 30 minutes",
      notes: "No sighters detail. Two hands may be used for all details. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase, unholster, and take a sight picture…",
      "With 6 rounds, load and make ready!…",
      "Is the line ready?",
      "The line is ready!",
      "Standby!…"
    ],
    extraNote: "When clearing Target Shotgun — ensure you can see the magazine follower — the command is \"Flag and Bag\" (insert a breech flag before casing the firearm).",
    details: [
      {
        id: "multitarget-m1",
        match: "Match 1", practice: null,
        distance: "25 metres", startPosition: "45 degrees",
        description: "6 shots in 15 seconds on the left hand or top target",
        timing: { type: "single", durationOptions: [{ label: "Match 1", seconds: 15 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "multitarget-m2",
        match: "Match 2", practice: null,
        distance: "20 metres", startPosition: "45 degrees",
        description: "6 shots in 10 seconds — 3 shots on each target",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 10 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "multitarget-m3",
        match: "Match 3", practice: null,
        distance: "15 metres", startPosition: "45 degrees",
        description: "6 shots total, two shots per appearance, on the right or bottom target. The firearm must return to the ready position between appearances.",
        timing: { type: "appearances", strings: 1, appearancesPerString: 3, exposureSeconds: 3, intervalSeconds: 5, shotsPerAppearance: 2 },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "multitarget-m4",
        match: "Match 4", practice: null,
        distance: "10 metres", startPosition: "45 degrees",
        description: "3 shots on each target in 8 seconds",
        timing: { type: "single", durationOptions: [{ label: "Match 4", seconds: 8 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "gp40",
    name: "GP40",
    code: "GP40",
    summary: {
      distances: "10, 15 & 25 metres",
      rounds: 40,
      maxScore: "400.040",
      duration: "approx. 30 minutes",
      notes: "There are some single-handed only shots. No sighters detail. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase, unholster, and take a sight picture…",
      "Do not chamber a round until you are in the shooting position!",
      "Is the line ready?",
      "The line is ready!",
      "Standby!"
    ],
    details: [
      {
        id: "gp40-m1",
        match: "Match 1", practice: null,
        distance: "10 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "5 shots, single handed",
        timing: { type: "single", durationOptions: [{ label: "Match 1", seconds: 8 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "gp40-m2",
        match: "Match 2", practice: null,
        distance: "10 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "10 shots including a reload. May use two hands.",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 20 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gp40-m3",
        match: "Match 3", practice: null,
        distance: "15 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "10 shots including a reload. May use two hands.",
        timing: { type: "single", durationOptions: [{ label: "Match 3", seconds: 20 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gp40-m4",
        match: "Match 4", practice: null,
        distance: "25 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "15 shots in 90 seconds — 5 sitting, 5 kneeling, 5 standing. May use two hands.",
        timing: { type: "single", durationOptions: [{ label: "Match 4", seconds: 90 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "gp85",
    name: "GP85",
    code: "GP85",
    summary: {
      distances: "10, 15 & 25 metres",
      rounds: 85,
      maxScore: "850.085",
      duration: "approx. 60 minutes",
      notes: "No sighters detail. Two hands may be used for all details. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase, unholster, and take a sight picture…",
      "Starting position, firearm empty, external hammer down, holstered, all magazines on the person.",
      "Is the line ready?",
      "The line is ready!",
      "Standby!…"
    ],
    details: [
      {
        id: "gp85-m1p1",
        match: "Match 1", practice: "Practice 1",
        distance: "10 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "10 shots including a reload",
        timing: { type: "single", durationOptions: [{ label: "Match 1.1", seconds: 30 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "gp85-m1p2",
        match: "Match 1", practice: "Practice 2",
        distance: "15 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "10 shots including a reload",
        timing: { type: "single", durationOptions: [{ label: "Match 1.2", seconds: 30 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gp85-m2",
        match: "Match 2", practice: null,
        distance: "25 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "15 shots in 90 seconds — 5 kneeling, 5 standing left hand supported, 5 standing right hand supported. Take care of strong-hand thumb placement when shooting weak-hand supported.",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 90 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gp85-m3",
        match: "Match 3", practice: "Practice 1 & 2",
        distance: "25 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "20 shots total — 10 shots in 35 seconds including a reload. Detail to be shot twice.",
        timing: { type: "single", durationOptions: [{ label: "Match 3", seconds: 35 }] },
        repeatCount: 2, scoreChangeAfter: true
      },
      {
        id: "gp85-m4",
        match: "Match 4", practice: null,
        distance: "25 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "20 shots in 2 minutes 45 seconds — 5 kneeling, 5 sitting, 5 standing left hand supported, 5 standing right hand supported. Take care of strong-hand thumb placement when shooting weak-hand supported.",
        timing: { type: "single", durationOptions: [{ label: "Match 4", seconds: 165 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gp85-m5",
        match: "Match 5", practice: "Practice 1 & 2",
        distance: "25 metres",
        startPosition: "Standing. Firearm empty, external hammer down, holstered, all magazines on the person.",
        description: "10 shots total — 5 shots in 12 seconds. Detail to be shot twice.",
        timing: { type: "single", durationOptions: [{ label: "Match 5", seconds: 12 }] },
        repeatCount: 2, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "gr1020",
    name: "GR1020",
    code: "1020",
    summary: {
      distances: "10, 15 & 25 metres",
      rounds: 102,
      maxScore: "1020.102",
      duration: "approx. 60 minutes",
      notes: "No sighters detail. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase and take a sight picture, and with 6 rounds, load and make ready!",
      "Is the line ready?",
      "The line is ready!",
      "Standby!…"
    ],
    extraNote: "Where both GRCF & GRSB are on the same line with different times, GRSB starts first, then GRCF.",
    details: [
      {
        id: "gr1020-m1p1",
        match: "Match 1", practice: "Practice 1",
        distance: "10 metres", startPosition: "Horizontal, at rest",
        description: "12 shots including a reload",
        timing: { type: "single", durationOptions: [{ label: "GRSB", seconds: 20 }, { label: "GRCF", seconds: 30 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "gr1020-m1p2",
        match: "Match 1", practice: "Practice 2",
        distance: "15 metres", startPosition: "Horizontal, at rest",
        description: "12 shots including a reload",
        timing: { type: "single", durationOptions: [{ label: "GRSB", seconds: 20 }, { label: "GRCF", seconds: 30 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gr1020-m2",
        match: "Match 2", practice: null,
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "18 shots in 90 seconds — 6 kneeling, 6 standing left shoulder, 6 standing right shoulder",
        loadCommand: "With 6 rounds, load and DO NOT make ready!",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 90 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gr1020-m3",
        match: "Match 3", practice: "Practice 1 & 2",
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "24 shots total — 12 shots in 35 seconds including a reload. Detail to be shot twice.",
        timing: { type: "single", durationOptions: [{ label: "Match 3", seconds: 35 }] },
        repeatCount: 2, scoreChangeAfter: true
      },
      {
        id: "gr1020-m4",
        match: "Match 4", practice: null,
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "24 shots in 2 minutes 45 seconds — 6 kneeling, 6 sitting, 6 standing left shoulder, 6 standing right shoulder",
        loadCommand: "With 6 rounds, load and DO NOT make ready!",
        timing: { type: "single", durationOptions: [{ label: "Match 4", seconds: 165 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gr1020-m5",
        match: "Match 5", practice: "Practice 1 & 2",
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "12 shots total — 6 shots in 12 seconds. Detail to be shot twice.",
        timing: { type: "single", durationOptions: [{ label: "Match 5", seconds: 12 }] },
        repeatCount: 2, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "gr1500",
    name: "GR1500",
    code: "1500",
    summary: {
      distances: "10, 15, 25 & 50 metres",
      rounds: 150,
      maxScore: "1500.150",
      duration: "approx. 90 minutes",
      notes: "There is a 2:45 sighters detail at 50m to start, where unlimited sighters may be fired in any position. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase and take a sight picture, and with 6 rounds, load and make ready!",
      "Is the line ready?",
      "The line is ready! … Standby!"
    ],
    extraNote: "Where both GRCF & GRSB are on the same line with different times, GRSB starts first, then GRCF.",
    details: [
      {
        id: "gr1500-sighters",
        match: "Sighters",
        practice: null,
        distance: "50 metres",
        startPosition: "Any position",
        description: "Unlimited sighters",
        timing: { type: "single", isSighters: true, durationOptions: [{ label: "Sighters", seconds: 165 }] },
        repeatCount: 1,
        scoreChangeAfter: false
      },
      {
        id: "gr1500-m1p1",
        match: "Match 1", practice: "Practice 1",
        distance: "10 metres", startPosition: "Horizontal, at rest",
        description: "12 shots including a reload",
        timing: { type: "single", durationOptions: [{ label: "GRSB", seconds: 20 }, { label: "GRCF", seconds: 30 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "gr1500-m1p2",
        match: "Match 1", practice: "Practice 2",
        distance: "15 metres", startPosition: "Horizontal, at rest",
        description: "12 shots including a reload",
        timing: { type: "single", durationOptions: [{ label: "GRSB", seconds: 20 }, { label: "GRCF", seconds: 30 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gr1500-m2",
        match: "Match 2", practice: null,
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "18 shots in 90 seconds — 6 kneeling, 6 standing left shoulder, 6 standing right shoulder",
        loadCommand: "With 6 rounds, load and DO NOT make ready!",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 90 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gr1500-m3",
        match: "Match 3", practice: null,
        distance: "50 metres", startPosition: "Horizontal, at rest",
        description: "24 shots in 2 minutes 45 seconds — 6 kneeling, 6 sitting, 6 standing left shoulder, 6 standing right shoulder",
        loadCommand: "With 6 rounds, load and DO NOT make ready!",
        timing: { type: "single", durationOptions: [{ label: "Match 3", seconds: 165 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gr1500-m4",
        match: "Match 4", practice: "Practice 1 & 2",
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "24 shots total — 12 shots in 35 seconds including a reload. Detail to be shot twice.",
        timing: { type: "single", durationOptions: [{ label: "Match 4", seconds: 35 }] },
        repeatCount: 2, scoreChangeAfter: true
      },
      {
        id: "gr1500-m5p1",
        match: "Match 5", practice: "Practice 1",
        distance: "10 metres", startPosition: "Horizontal, at rest",
        description: "12 shots including a reload",
        timing: { type: "single", durationOptions: [{ label: "GRSB", seconds: 20 }, { label: "GRCF", seconds: 30 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "gr1500-m5p2",
        match: "Match 5", practice: "Practice 2",
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "18 shots in 90 seconds — 6 kneeling, 6 standing left shoulder, 6 standing right shoulder",
        loadCommand: "With 6 rounds, load and DO NOT make ready!",
        timing: { type: "single", durationOptions: [{ label: "Match 5.2", seconds: 90 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gr1500-m5p3",
        match: "Match 5", practice: "Practice 3",
        distance: "50 metres", startPosition: "Horizontal, at rest",
        description: "24 shots in 2 minutes 45 seconds — 6 kneeling, 6 sitting, 6 standing left shoulder, 6 standing right shoulder",
        loadCommand: "With 6 rounds, load and DO NOT make ready!",
        timing: { type: "single", durationOptions: [{ label: "Match 5.3", seconds: 165 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "gr1500-m5p4",
        match: "Match 5", practice: "Practice 4",
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "6 shots in 12 seconds",
        timing: { type: "single", durationOptions: [{ label: "Match 5.4", seconds: 12 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "benchrest50",
    name: "50m Benchrest",
    code: "BR50",
    summary: {
      distances: "50 metres",
      rounds: "50 (plus unlimited sighters)",
      maxScore: "500.050",
      duration: "approx. 60 minutes",
      notes: "Benched. Optics/weight classes: Factory Sporter (12x max, 8.5lbs), International Sporter (6.5x max, 8.5lbs), Light Varmint (no scope limit, 10.5lbs), Heavy Varmint (no scope limit, 15.0lbs), Semi-Auto (12x max, 8.5lbs). Higher-magnification scopes must be taped/locked for the match. Spotting scopes permitted; rifles may be weighed on entry."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to insert bolts, load and make ready!…",
      "Is the line ready?",
      "Line is Ready!",
      "Standby!",
      "Commence Fire"
    ],
    extraNote: "Bolts may only be inserted or safety flags removed on the RO's instruction. When ceasefire is called, all rifles must either be cased, or have the bolt removed and a flag inserted. No talking on the line during the course of fire; mobiles must be off/silenced. Remain seated until time has elapsed or the last shot has been fired. Targets must be marked with the competitor's name, discipline, and card number. Before rifles are uncased and set up, allow time for wind flags etc. — 10 minutes' setup time is allowed after the command to uncase and set up. The RO may call time remaining at 10, 5, 3 and 1 minutes, and 30 seconds prior to ceasefire.",
    details: [
      {
        id: "benchrest50-card1",
        match: "Card 1", practice: null,
        distance: "50 metres", startPosition: "Benched",
        description: "25 scoring targets, one shot at each, plus unlimited sighters into the side columns, within the time allowed",
        timing: { type: "single", durationOptions: [{ label: "Card 1", seconds: 1200 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "benchrest50-card2",
        match: "Card 2", practice: null,
        distance: "50 metres", startPosition: "Benched",
        description: "25 scoring targets, one shot at each, plus unlimited sighters into the side columns, within the time allowed",
        timing: { type: "single", durationOptions: [{ label: "Card 2", seconds: 1200 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "precision50",
    name: "50m Precision",
    code: "50P",
    summary: {
      distances: "50 metres",
      rounds: 30,
      maxScore: "300.030",
      duration: "approx. 30 minutes",
      notes: "Includes a sighters detail with unlimited sighters permitted in the time frame. Two hands may be used for all details except Single Handed Smallbore Pistol (SSBP50P). Spotting scopes are permitted. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase, unholster, and take a sight picture…",
      "With the required number of rounds, load and make ready!…",
      "Is the line ready?",
      "The line is ready!",
      "Standby!…"
    ],
    details: [
      {
        id: "precision50-sighters",
        match: "Sighters", practice: null,
        distance: "50 metres", startPosition: "45 degrees",
        description: "Unlimited sighters",
        timing: { type: "single", isSighters: true, durationOptions: [{ label: "Sighters", seconds: 300 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "precision50-m1",
        match: "Match 1", practice: null,
        distance: "50 metres", startPosition: "45 degrees",
        description: "10 shots in 5 minutes",
        timing: { type: "single", durationOptions: [{ label: "Match 1", seconds: 300 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "precision50-m2",
        match: "Match 2", practice: null,
        distance: "50 metres", startPosition: "45 degrees",
        description: "10 shots in 5 minutes",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 300 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "precision50-m3",
        match: "Match 3", practice: null,
        distance: "50 metres", startPosition: "45 degrees",
        description: "10 shots in 5 minutes",
        timing: { type: "single", durationOptions: [{ label: "Match 3", seconds: 300 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "prone50",
    name: "50m Sporting Rifle Prone",
    code: "SPR50",
    summary: {
      distances: "50 metres",
      rounds: "40 (plus unlimited sighters)",
      maxScore: "400.040",
      duration: "approx. 60 minutes",
      notes: "Prone. Weight limits: Sporting Rifle 10.5lbs (bolt & magazine inserted), Field Sporting Rifle 10.5lbs (bolt & magazine inserted), Open Field Sporting Rifle unlimited, Target Rifle unlimited. Sporting Rifle & Target Rifle: no front or rear rests. Field Sporting Rifle: bipods, free supports, or hunting-style slings allowed (rear bags/rests allowed). Open Field Sporting Rifle: any front rests or separate rear bag rests allowed. Normal ISSF-style shooting jackets allowed for Sporting and Target Rifle with single-point slings; shooting gloves permitted. Spotting scopes allowed provided the competitor doesn't touch them for support."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to insert bolts, load and make ready!…",
      "Is the line ready?",
      "Line is Ready!",
      "Standby!",
      "Commence Fire"
    ],
    extraNote: "Bolts may only be inserted or safety flags removed on the RO's instruction. When ceasefire is called, all rifles must either be cased, or have the bolt removed and a flag inserted. No talking on the line during the course of fire; mobiles must be off/silenced. Remain quiet until time has elapsed or the last shot has been fired. Targets must be marked with the competitor's name, discipline, and card number. 10 minutes' setup time is allowed after the command to uncase and set up. The RO may call time remaining at 10, 5, 3 and 1 minutes, and 30 seconds prior to ceasefire.",
    details: [
      {
        id: "prone50-card1",
        match: "Card 1", practice: null,
        distance: "50 metres", startPosition: "Prone",
        description: "Unlimited shots on the two sighting targets, plus 5 shots on each of the four scoring targets, within the time allowed",
        timing: { type: "single", durationOptions: [{ label: "Card 1", seconds: 1200 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "prone50-card2",
        match: "Card 2", practice: null,
        distance: "50 metres", startPosition: "Prone",
        description: "Unlimited shots on the two sighting targets, plus 5 shots on each of the four scoring targets, within the time allowed",
        timing: { type: "single", durationOptions: [{ label: "Card 2", seconds: 1200 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "r400",
    name: "Revolver 400",
    code: "R400",
    summary: {
      distances: "10, 15, 20 & 25 metres",
      rounds: 40,
      maxScore: "400.040",
      duration: "approx. 30 minutes",
      notes: "No sighters detail. Two hands may be used for all details. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase, unholster, and take a sight picture…",
      "With 5 rounds, load and make ready!…",
      "Is the line ready?",
      "The line is ready!",
      "Standby!…"
    ],
    details: [
      {
        id: "r400-m1",
        match: "Match 1", practice: null,
        distance: "25 metres", startPosition: "45 degrees",
        description: "15 shots in 2 minutes including 2 reloads, on the top target",
        timing: { type: "single", durationOptions: [{ label: "Match 1", seconds: 120 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "r400-m2",
        match: "Match 2", practice: null,
        distance: "20 metres", startPosition: "45 degrees",
        description: "5 shots in 10 seconds on the bottom target",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 10 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "r400-m3",
        match: "Match 3", practice: null,
        distance: "15 metres", startPosition: "45 degrees",
        description: "10 shots in two strings of 5 on the bottom target. One shot per appearance. The firearm must return to the ready position between appearances.",
        timing: { type: "appearances", strings: 2, appearancesPerString: 5, exposureSeconds: 2, intervalSeconds: 5, shotsPerAppearance: 1 },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "r400-m4",
        match: "Match 4", practice: null,
        distance: "10 metres", startPosition: "45 degrees",
        description: "10 shots in 40 seconds including a reload — 5 shots on each target",
        timing: { type: "single", durationOptions: [{ label: "Match 4", seconds: 40 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "tp2",
    name: "Timed & Precision 2",
    code: "TP2",
    summary: {
      distances: "10, 15, 25 & 50 metres",
      rounds: 60,
      maxScore: "600.060",
      duration: "approx. 60 minutes",
      notes: "No sighters detail. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase and take a sight picture…",
      "With 6 rounds, load and make ready!",
      "Is the line ready?",
      "The line is ready!",
      "Standby!…"
    ],
    extraNote: "Where both GRCF & GRSB are on the same line with different times, GRSB goes first, then GRCF.",
    details: [
      {
        id: "tp2-m1",
        match: "Match 1", practice: null,
        distance: "10 metres", startPosition: "45 degrees",
        description: "6 shots, standing unsupported. This practice will be shot twice.",
        timing: { type: "single", durationOptions: [{ label: "GRSB", seconds: 5 }, { label: "GRCF", seconds: 8 }] },
        repeatCount: 2, scoreChangeAfter: true
      },
      {
        id: "tp2-m2",
        match: "Match 2", practice: null,
        distance: "50 metres", startPosition: "45 degrees",
        description: "24 shots — 6 kneeling, 6 sitting, 6 standing left shoulder, 6 standing right shoulder",
        loadCommand: "With 6 rounds, load and DO NOT make ready!",
        timing: { type: "single", durationOptions: [{ label: "GRSB", seconds: 150 }, { label: "GRCF", seconds: 180 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "tp2-m3",
        match: "Match 3", practice: null,
        distance: "25 metres", startPosition: "Horizontal, at rest",
        description: "24 shots — 6 kneeling, 6 sitting, 6 standing right shoulder, 6 standing left shoulder",
        loadCommand: "With 6 rounds, load and DO NOT make ready!",
        timing: { type: "single", durationOptions: [{ label: "GRSB", seconds: 105 }, { label: "GRCF", seconds: 120 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "wa48",
    name: "Centrefire Pistol 48 Shot",
    code: "WA48",
    summary: {
      distances: "10, 15 & 25 metres",
      rounds: 48,
      maxScore: "480.048",
      duration: "approx. 30 minutes",
      notes: "No sighters detail. Standing unsupported."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to take a sight picture…",
      "With 6 rounds, load and holster!",
      "Is the line ready?",
      "Line is ready!",
      "Standby!",
      "Commence Fire"
    ],
    details: [
      {
        id: "wa48-m1p1",
        match: "Match 1", practice: "Practice 1",
        distance: "10 metres",
        startPosition: "Chamber empty, external hammer down, magazine inserted, holstered.",
        description: "6 shots, standing without support, one-handed",
        timing: { type: "single", durationOptions: [{ label: "Match 1.1", seconds: 8 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "wa48-m2",
        match: "Match 2", practice: null,
        distance: "10 metres",
        startPosition: "Chamber empty, external hammer down, magazine inserted, holstered.",
        description: "12 shots, standing without support",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 20 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "wa48-m3",
        match: "Match 3", practice: null,
        distance: "15 metres",
        startPosition: "Chamber empty, external hammer down, magazine inserted, holstered.",
        description: "12 shots, standing without support",
        timing: { type: "single", durationOptions: [{ label: "Match 3", seconds: 20 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "wa48-m4",
        match: "Match 4", practice: null,
        distance: "25 metres",
        startPosition: "Chamber empty, external hammer down, magazine inserted, holstered.",
        description: "18 shots in 90 seconds — 6 kneeling (post must be used, line must be obeyed), 6 standing left hand at the left post, 6 standing right hand at the right post",
        timing: { type: "single", durationOptions: [{ label: "Match 4", seconds: 90 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  },

  {
    id: "wa1500",
    name: "WA1500 Main Match",
    code: "WAMM",
    summary: {
      distances: "7, 10, 15, 25 & 50 metres",
      rounds: 150,
      maxScore: "1500.150",
      duration: "approx. 90 minutes",
      notes: "There is a 2:45 sighters detail at 50m to start, where unlimited sighters may be fired in any position. Standing unsupported. Iron sights only."
    },
    rangeCommands: [
      "Do you understand the Course of Fire?",
      "Eyes & Ears, the range is going Live!",
      "You are free to uncase, unholster, and take a sight picture…",
      "With 6 rounds, load and holster. Do not chamber a round until you are in the shooting position!",
      "Is the line ready?",
      "The line is Ready!",
      "Standby!…"
    ],
    details: [
      {
        id: "wa1500-sighters",
        match: "Sighters", practice: null,
        distance: "50 metres", startPosition: "Any position",
        description: "Unlimited sighters",
        timing: { type: "single", isSighters: true, durationOptions: [{ label: "Sighters", seconds: 165 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "wa1500-m1p1",
        match: "Match 1", practice: "Practice 1",
        distance: "7 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "12 shots including a reload — DA only",
        timing: { type: "single", durationOptions: [{ label: "Match 1.1", seconds: 20 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "wa1500-m1p2",
        match: "Match 1", practice: "Practice 2",
        distance: "15 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "12 shots including a reload — DA only",
        timing: { type: "single", durationOptions: [{ label: "Match 1.2", seconds: 20 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "wa1500-m2",
        match: "Match 2", practice: null,
        distance: "25 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "18 shots in 90 seconds, DA only — 6 kneeling, 6 standing left hand with support, 6 standing right hand with support",
        timing: { type: "single", durationOptions: [{ label: "Match 2", seconds: 90 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "wa1500-m3",
        match: "Match 3", practice: null,
        distance: "50 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "24 shots in 2 minutes 45 seconds, DA/SA — 6 sitting, 6 prone, 6 standing left hand with support, 6 standing right hand with support",
        timing: { type: "single", durationOptions: [{ label: "Match 3", seconds: 165 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "wa1500-m4",
        match: "Match 4", practice: "Practice 1 & 2",
        distance: "25 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "24 shots total — 12 shots in 35 seconds including a reload, DA only. Detail to be shot twice.",
        timing: { type: "single", durationOptions: [{ label: "Match 4", seconds: 35 }] },
        repeatCount: 2, scoreChangeAfter: true
      },
      {
        id: "wa1500-m5p1",
        match: "Match 5", practice: "Practice 1",
        distance: "10 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "12 shots including a reload — DA only",
        timing: { type: "single", durationOptions: [{ label: "Match 5.1", seconds: 20 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "wa1500-m5p2",
        match: "Match 5", practice: "Practice 2",
        distance: "25 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "18 shots in 90 seconds, DA only — 6 kneeling, 6 standing left hand with support, 6 standing right hand with support",
        timing: { type: "single", durationOptions: [{ label: "Match 5.2", seconds: 90 }] },
        repeatCount: 1, scoreChangeAfter: true
      },
      {
        id: "wa1500-m5p3",
        match: "Match 5", practice: "Practice 3",
        distance: "50 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "24 shots in 2 minutes 45 seconds, DA/SA — 6 sitting, 6 prone, 6 standing left hand with support, 6 standing right hand with support",
        timing: { type: "single", durationOptions: [{ label: "Match 5.3", seconds: 165 }] },
        repeatCount: 1, scoreChangeAfter: false
      },
      {
        id: "wa1500-m5p4",
        match: "Match 5", practice: "Practice 4",
        distance: "25 metres", startPosition: "Chamber empty, hammer down, holstered.",
        description: "6 shots in 12 seconds — DA only",
        timing: { type: "single", durationOptions: [{ label: "Match 5.4", seconds: 12 }] },
        repeatCount: 1, scoreChangeAfter: false
      }
    ]
  }
];
