import Field from './experiments/Field.jsx'

/*
  Single source of truth for experiments. The lab (#lab) renders them;
  the site's Experiments section lists them. Adding an experiment here
  makes it appear in both places.
  status: 'open' = still being played with · 'kept' = settled, staying
*/
export const EXPERIMENTS = [
  {
    id: 'field',
    title: '01 · field',
    note: 'seeded noise → geometry, springs on the pointer',
    date: '2026-07-19',
    status: 'open',
    Component: Field,
  },
]
