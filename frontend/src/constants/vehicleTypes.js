// frontend/src/constants/vehicleTypes.js
// Master list of vehicle types — single source of truth across all dropdowns
// id = PK in vehicle_types table (migration 025); used as FK in vehicles.vehicle_type_id

export const VEHICLE_TYPES = [
  { id: 1,  code: 'EV_2W',      label: 'Electric 2-Wheeler',        category: 'EV',    isEV: true,  icon: '⚡🏍️' },
  { id: 2,  code: 'EV_3W',      label: 'Electric Auto (E-Rickshaw)', category: 'EV',    isEV: true,  icon: '⚡🛺' },
  { id: 3,  code: 'EV_4W',      label: 'Electric Car',               category: 'EV',    isEV: true,  icon: '⚡🚗' },
  { id: 4,  code: 'EV_LCV',     label: 'Electric Light CV / Van',    category: 'EV',    isEV: true,  icon: '⚡🚐' },
  { id: 5,  code: 'EV_HCV',     label: 'Electric Heavy CV / Truck',  category: 'EV',    isEV: true,  icon: '⚡🚛' },
  { id: 6,  code: 'CNG_AUTO',   label: 'CNG Auto',                   category: 'CNG',   isEV: false, icon: '🟢🛺' },
  { id: 7,  code: 'CNG_CAR',    label: 'CNG Car',                    category: 'CNG',   isEV: false, icon: '🟢🚗' },
  { id: 8,  code: 'CNG_BUS',    label: 'CNG Bus / Mini-bus',         category: 'CNG',   isEV: false, icon: '🟢🚌' },
  { id: 9,  code: 'PETROL_2W',  label: 'Petrol 2-Wheeler',           category: 'FUEL',  isEV: false, icon: '⛽🏍️' },
  { id: 10, code: 'PETROL_CAR', label: 'Petrol Car',                 category: 'FUEL',  isEV: false, icon: '⛽🚗' },
  { id: 11, code: 'DIESEL_LCV', label: 'Diesel Truck / LCV',         category: 'FUEL',  isEV: false, icon: '⛽🚛' },
  { id: 12, code: 'DIESEL_BUS', label: 'Diesel Bus',                 category: 'FUEL',  isEV: false, icon: '⛽🚌' },
  { id: 13, code: 'OTHER',      label: 'Other',                      category: 'OTHER', isEV: false, icon: '🚘'  },
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
