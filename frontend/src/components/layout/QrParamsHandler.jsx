import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import { toast } from '../../store/useToastStore';

/**
 * When a student scans a table QR (…/menu?orderType=DINE_IN&table=7) we switch the cart to
 * Dine-in, store the table number, then strip the params from the URL.
 */
export default function QrParamsHandler() {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const setOrderType = useCartStore((s) => s.setOrderType);
  const setTableNumber = useCartStore((s) => s.setTableNumber);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const table = params.get('table');
    if (!table) return;
    setOrderType('DINE_IN');
    setTableNumber(table.slice(0, 10));
    toast.success(`Dine-in mode on: Table ${table}`);
    params.delete('table');
    params.delete('orderType');
    const rest = params.toString();
    navigate(pathname + (rest ? `?${rest}` : ''), { replace: true });
  }, [search, pathname, navigate, setOrderType, setTableNumber]);

  return null;
}
