import React from 'react';
import { STATUS } from '../../utils/constants';

export default function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.PENDING;
  return <span className={`chip ${s.tone}`}>{s.label}</span>;
}
