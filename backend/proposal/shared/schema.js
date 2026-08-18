export const SCHEMA_VERSION = '2026.3';
export const REPEAT_GROUP_MAX = 40;

function text(id, label, extra = {}) {
  const question = {
    kind: 'text',
    id,
    label,
    required: extra.required !== false,
    maxLength: extra.maxLength ?? 200
  };
  if (extra.help) question.help = extra.help;
  if (extra.default != null) question.default = extra.default;
  return question;
}

function email(id, label, extra = {}) {
  const question = {
    kind: 'email',
    id,
    label,
    required: extra.required !== false,
    maxLength: extra.maxLength ?? 254
  };
  if (extra.help) question.help = extra.help;
  return question;
}

function date(id, label, extra = {}) {
  const question = {
    kind: 'date',
    id,
    label,
    required: Boolean(extra.required)
  };
  if (extra.help) question.help = extra.help;
  return question;
}

function paragraph(id, label, extra = {}) {
  const question = {
    kind: 'paragraph',
    id,
    label,
    required: Boolean(extra.required),
    maxLength: extra.maxLength ?? 4000
  };
  if (extra.help) question.help = extra.help;
  return question;
}

function count(id, label, extra = {}) {
  const question = {
    kind: 'count',
    id,
    label,
    required: extra.required !== false,
    min: extra.min ?? 0
  };
  if (extra.help) question.help = extra.help;
  if (extra.max != null) question.max = extra.max;
  if (extra.visibleIf) question.visibleIf = extra.visibleIf;
  return question;
}

function select(id, label, options, extra = {}) {
  return {
    kind: 'select',
    id,
    label,
    options,
    required: Boolean(extra.required)
  };
}

function repeat(id, label, extra) {
  return {
    kind: 'repeat',
    id,
    label,
    repeatFor: extra.repeatFor,
    itemLabel: extra.itemLabel,
    max: extra.max ?? REPEAT_GROUP_MAX,
    fields: extra.fields
  };
}

export const steps = [
  {
    id: 'projectDetails',
    title: 'Project Details',
    questions: [
      text('contractorName', 'Your Name'),
      email('contractorEmail', 'Your Email', {
        help: 'Please enter a valid email below and a proposal will be emailed to you.'
      }),
      text('projectClientName', 'Project Client Name', {
        required: false,
        default: 'Private Client'
      }),
      text('projectPoName', 'Project PO Name', {
        help: 'Include this for invoicing.'
      }),
      text('projectAddress', 'Project Location', {
        default: 'Private Location',
        help: 'A city is fine.'
      }),
      date('projectTimeline', 'Project Timeline', {
        required: true,
        help: 'Include expected install date.'
      })
    ]
  },
  {
    id: 'siteDetails',
    title: 'Site Details',
    questions: [
      count('rooms', 'Number of Rooms', {
        min: 1,
        max: REPEAT_GROUP_MAX,
        help: 'Include all interior rooms that have some sort of control. Usually audio zones or lighting zones are the determining factor for inclusion. Exterior areas are entered later.'
      }),
      repeat('roomDetails', 'Rooms', {
        repeatFor: 'rooms',
        itemLabel: (index) => `Room ${index + 1}`,
        fields: [
          text('name', 'Room name', { required: false, maxLength: 80 })
        ]
      }),
      count('floors', 'Number of Floors', {
        min: 1,
        help: 'Include this for calculating the cost of a floor plan based UI.'
      }),
      count('exteriorZones', 'Number of Exterior Zones', {
        max: REPEAT_GROUP_MAX,
        help: 'Include all exterior areas that have some sort of control. Usually audio zones or lighting zones are the determining factor for inclusion. Examples would be front yard, back yard, side yard etc.'
      }),
      repeat('exteriorZoneDetails', 'Exterior Zones', {
        repeatFor: 'exteriorZones',
        itemLabel: (index) => `Exterior Zone ${index + 1}`,
        fields: [
          text('name', 'Zone name', { required: false, maxLength: 80 })
        ]
      }),
    ]
  },
  {
    id: 'lightingShading',
    title: 'Lighting/Shading Control',
    questions: [
      count('lightingZones', 'Lighting Zones', {
        help: 'Include the number of lighting zones that you want to control in RTI.'
      }),
      count('shadingZones', 'Shading Zones', {
        help: 'Include the number of shading zones that you want to control in RTI.'
      }),
      count('keypadZones', 'Keypad Zones (Lighting or Shading)', {
        help: 'Include the number of lighting or shading keypads that you want to control in RTI.'
      })
    ]
  },
  {
    id: 'audioVideo',
    title: 'Audio/Video Control',
    questions: [
      count('audioZones', 'Distributed Audio Zones'),
      count('audioDiscreteSourceZones', 'Audio Sources', {
        max: REPEAT_GROUP_MAX,
        help: 'Include any streamers, turntables or other audio only sources (distributed and local).'
      }),
      repeat('audioSourceDetails', 'Audio Sources', {
        repeatFor: 'audioDiscreteSourceZones',
        itemLabel: (index) => `Audio Source ${index + 1}`,
        fields: [
          text('name', 'Source name', { required: false, maxLength: 80 }),
          select('type', 'Type', ['Streamer', 'Tuner', 'Turntable', 'Custom'], { required: true })
        ]
      }),
      count('videoZones', 'Distributed Video Zones'),
      count('videoDiscreteSourceZones', 'Video Sources', {
        max: REPEAT_GROUP_MAX,
        help: 'Include any media players, cable/sat boxes or other video sources (distributed and local).'
      }),
      repeat('videoSourceDetails', 'Video Sources', {
        repeatFor: 'videoDiscreteSourceZones',
        itemLabel: (index) => `Video Source ${index + 1}`,
        fields: [
          text('name', 'Source name', { required: false, maxLength: 80 }),
          select('type', 'Type', ['Media Player', 'Cable or Satellite', 'Games Console', 'Custom'], { required: true })
        ]
      }),
      count('avReceiverDiscreteZones', 'AV Receiver Zones', {
        max: REPEAT_GROUP_MAX,
        help: 'Include theatres, cinemas and other rooms with a surround sound receiver.'
      }),
      count('displayDiscreteZones', 'Display Zones', {
        max: REPEAT_GROUP_MAX,
        help: 'Include any TVs or projectors to be controlled.'
      }),
      repeat('displayDetails', 'Displays', {
        repeatFor: 'displayDiscreteZones',
        itemLabel: (index) => `Display ${index + 1}`,
        fields: [
          text('name', 'Display name', { required: false, maxLength: 80 }),
          select('type', 'Type', ['TV', 'Projector'], { required: true })
        ]
      }),
    ]
  },
  {
    id: 'climate',
    title: 'Climate Control',
    questions: [
      count('thermostatZones', 'Thermostat Zones', {
        help: 'Include the number of thermostats.'
      }),
      count('heaterZones', 'Heater Zones', {
        help: 'Include outdoor heaters, garage heaters or fireplaces. These are usually controlled with a timer as well.'
      }),
      count('fanZones', 'Fan Zones', {
        help: 'Include bathroom fans, exercise room fans, circulating fans etc. These are usually controlled with a timer as well.'
      })
    ]
  },
  {
    id: 'security',
    title: 'Security Control',
    questions: [
      count('alarmZones', 'Alarm Zones', {
        help: 'Include this if we are integrating with an alarm system in RTI.'
      }),
      count('accessZones', 'Access Zones', {
        help: 'Include gates, garage doors or other controlled doors.'
      }),
      count('cameraZones', 'Camera Zones', {
        max: REPEAT_GROUP_MAX
      }),
      repeat('cameraDetails', 'Cameras', {
        repeatFor: 'cameraZones',
        itemLabel: (index) => `Camera ${index + 1}`,
        fields: [
          text('name', 'Camera name', { required: false, maxLength: 80 }),
          text('location', 'Location', { required: false, maxLength: 80 })
        ]
      })
    ]
  },
  {
    id: 'poolAndPumps',
    title: 'Pool and Pump Control',
    questions: [
      count('poolZones', 'Pool Zones', {
        help: 'Include pools, hot tubs and saunas.'
      }),
      count('pumpZones', 'Pump Zones', {
        help: 'Include any other pumps, water features etc that will be controlled.'
      })
    ]
  },
  {
    id: 'inputOutput',
    title: 'Input and Output Zones',
    questions: [
      count('inputSenseZones', 'Input Zones (Sense)', {
        help: 'Include this for any sense inputs. Examples could be gate closure contacts, pressure sensors etc.'
      }),
      count('outputRelayZones', 'Output Zones (Relays)', {
        help: 'Include this for any misc. relay controlled devices.'
      })
    ]
  },
  {
    id: 'controllers',
    title: 'Controllers',
    questions: [
      count('globalControllerCount', 'Global Controllers', {
        max: REPEAT_GROUP_MAX,
        help: 'iPhone, iPad, Touchscreens (controls all rooms, all sources)'
      }),
      repeat('globalControllerDetails', 'Global Controllers', {
        repeatFor: 'globalControllerCount',
        itemLabel: (index) => `Global Controller ${index + 1}`,
        fields: [
          select('type', 'Type', ['iPhone', 'iPad', 'Touchscreen'], { required: true })
        ]
      }),
      count('floorplanAddOnCount', 'Floorplan Add On for Global Controllers', {
        required: false,
        visibleIf: (answers) => (Number(answers.globalControllerCount) || 0) > 0,
        help: 'Include this for each Global Controller (iPad, Touchscreens) that you would like a floorplan interface.'
      }),
      count('roomControllerCount', 'Single Room Controllers', {
        help: 'Handheld Remotes, Touchscreens (controls single room, local sources)'
      })
    ]
  },
  {
    id: 'finalSubmit',
    title: 'Final Submit',
    questions: [
      paragraph('additionalInfo', 'Additional Info', {
        required: false,
        help: 'Please include any additional information that will help me put together a budget for your project.'
      })
    ]
  }
];

export function getQuestions(schemaSteps = steps) {
  return schemaSteps.flatMap((step) => step.questions);
}

export function findQuestion(id, schemaSteps = steps) {
  return getQuestions(schemaSteps).find((question) => question.id === id);
}

export function isVisible(question, answers) {
  if (typeof question.visibleIf !== 'function') return true;
  return Boolean(question.visibleIf(answers));
}
