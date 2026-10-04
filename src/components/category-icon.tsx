import {
  ShoppingBasket,
  CarFront,
  HeartPulse,
  House,
  MoreHorizontal,
  Shirt,
  Ticket,
  Utensils,
  WalletCards,
  Zap,
} from "lucide-react";

const icons = {
  basket: ShoppingBasket,
  utensils: Utensils,
  car: CarFront,
  shirt: Shirt,
  zap: Zap,
  ticket: Ticket,
  health: HeartPulse,
  mortgage: House,
  transfer: WalletCards,
  other: MoreHorizontal,
};

export function CategoryIcon({ name, color }: { name: string; color?: string }) {
  const Icon = icons[name as keyof typeof icons] ?? MoreHorizontal;
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-xl"
      style={{ backgroundColor: `${color ?? "#718096"}18`, color: color ?? "#718096" }}
    >
      <Icon className="size-4" />
    </span>
  );
}
