const STOCK_LABEL = {
  healthy: 'Healthy',
  below_reorder: 'Below reorder point',
  out_of_stock: 'Out of stock',
};

const STOCK_TONE = {
  healthy: 'teal',
  below_reorder: 'amber',
  out_of_stock: 'red',
};

const BATCH_LABEL = {
  active: 'Active',
  near_expiry: 'Near expiry',
  expired: 'Expired',
};

const BATCH_TONE = {
  active: 'teal',
  near_expiry: 'amber',
  expired: 'red',
};

export function StockBadge({ status }) {
  return <span className={`tag ${STOCK_TONE[status] ?? ''}`}>{STOCK_LABEL[status] ?? status}</span>;
}

export function BatchBadge({ status }) {
  return <span className={`tag ${BATCH_TONE[status] ?? ''}`}>{BATCH_LABEL[status] ?? status}</span>;
}

export function ClassBadge({ abc, xyz }) {
  return <span className="tag mono">{abc}{xyz}</span>;
}
