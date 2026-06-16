// frontend/src/constants/vehicleTypes.js
// Master list of vehicle types — single source of truth across all dropdowns

export const VEHICLE_TYPES = [
  { code: 'EV_2W',      label: 'Electric 2-Wheeler',        category: 'EV',   icon: '⚡🏍️' },
  { code: 'EV_3W',      label: 'Electric Auto (E-Rickshaw)', category: 'EV',   icon: '⚡🛺' },
  { code: 'EV_4W',      label: 'Electric Car',               category: 'EV',   icon: '⚡🚗' },
  { code: 'EV_LCV',     label: 'Electric Light CV / Van',    category: 'EV',   icon: '⚡🚐' },
  { code: 'EV_HCV',     label: 'Electric Heavy CV / Truck',  category: 'EV',   icon: '⚡🚛' },
  { code: 'CNG_AUTO',   label: 'CNG Auto',                   category: 'CNG',  icon: '🟢🛺' },
  { code: 'CNG_CAR',    label: 'CNG Car',                    category: 'CNG',  icon: '🟢🚗' },
  { code: 'CNG_BUS',    label: 'CNG Bus / Mini-bus',         category: 'CNG',  icon: '🟢🚌' },
  { code: 'PETROL_2W',  label: 'Petrol 2-Wheeler',           category: 'FUEL', icon: '⛽🏍️' },
  { code: 'PETROL_CAR', label: 'Petrol Car',                 category: 'FUEL', icon: '⛽🚗' },
  { code: 'DIESEL_LCV', label: 'Diesel Truck / LCV',         category: 'FUEL', icon: '⛽🚛' },
  { code: 'DIESEL_BUS', label: 'Diesel Bus',                 category: 'FUEL', icon: '⛽🚌' },
  { code: 'OTHER',      label: 'Other',                      category: 'OTHER', icon: '🚘'  },
];

export const VEHICLE_TYPE_MAP = Object.fromEntries(VEHICLE_TYPES.map(t => [t.code, t]));

export const vehicleTypeLabel = (code) => VEHICLE_TYPE_MAP[code]?.label || code || 'Vehicle';

export const VEHICLE_TYPE_GROUPS = [
  { group: 'Electric (EV)',    types: VEHICLE_TYPES.filter(t => t.category === 'EV')    },
  { group: 'CNG',              types: VEHICLE_TYPES.filter(t => t.category === 'CNG')   },
  { group: 'Petrol / Diesel',  types: VEHICLE_TYPES.filter(t => t.category === 'FUEL')  },
  { group: 'Other',            types: VEHICLE_TYPES.filter(t => t.category === 'OTHER') },
];

export const DEFAULT_VEHICLE_TYPE = 'EV_3W';
