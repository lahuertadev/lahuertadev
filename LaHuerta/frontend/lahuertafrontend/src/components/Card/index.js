import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSpotlight from '../../hooks/useSpotlight';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import AddShoppingCartOutlined from '@mui/icons-material/AddShoppingCartOutlined';
import PlaylistAddOutlined from '@mui/icons-material/PlaylistAddOutlined';

const ICONS = {
  expense: ReceiptLongOutlined,
  clients: PeopleAltOutlined,
  billing: DescriptionOutlined,
  payments: PaymentsOutlined,
  suppliers: LocalShippingOutlined,
  purchases: ShoppingCartOutlined,
  priceList: SellOutlined,
  reports: BarChartOutlined,
  singlePurchase: AddShoppingCartOutlined,
  bulkPurchase: PlaylistAddOutlined,
};

export default function AccessCard({ title, description, url, icon, size = 'compact' }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);

  useSpotlight(cardRef);

  const Icon = ICONS[icon];
  const isFeatured = size === 'featured';

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => navigate(url)}
      style={{ transform: 'perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))' }}
      className={`group relative flex w-full cursor-pointer flex-col items-start justify-between gap-1 rounded-2xl border border-border-subtle bg-surface-card p-3 text-left transition-[border-color,box-shadow] duration-200 hover:border-accent/50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${isFeatured ? 'sm:col-span-2' : ''}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), rgb(var(--color-accent-rgb) / 0.16), transparent 65%)',
        }}
      />
      <span className="relative flex flex-col items-start gap-1">
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent ${isFeatured ? 'sm:h-9 sm:w-9' : ''}`}>
            <Icon fontSize="small" />
          </span>
        )}
        {isFeatured && (
          <p className="hidden text-[10px] font-bold uppercase tracking-wider text-accent sm:block">Más usado</p>
        )}
      </span>
      <span className="relative">
        <h2 className={`text-sm font-semibold text-on-surface ${isFeatured ? 'sm:text-base' : ''}`}>{title}</h2>
        <p className="text-xs text-on-surface-muted">{description}</p>
      </span>
    </button>
  );
}
