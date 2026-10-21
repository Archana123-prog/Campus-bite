import React from 'react';
import { useParams } from 'react-router-dom';
import OrderTracker from '../components/order/OrderTracker';

export default function TrackerPage() {
  const { orderId } = useParams();
  return (
    <div className="px-4 py-8">
      <OrderTracker orderId={orderId} />
    </div>
  );
}
