import {
  AlertTriangle, Banknote, Cake, Calendar, Circle, Droplets, Egg, Factory, FileText, Fish, Flame, Flower2,
  GraduationCap, Grid3x3, Home, Landmark, MapPin, Milk, Package, Palette, PawPrint, Printer, Scissors, ShieldCheck,
  Shirt, Smartphone, Snowflake, Sparkles, Sprout, Store, TrendingUp, Truck, Users, UtensilsCrossed, Waves, Wheat,
  Wrench, Zap, type LucideIcon, type LucideProps,
} from 'lucide-react';

/**
 * Icons are stored by lucide name in the database (sectors.icon, sector_questions.icon).
 * An explicit map keeps the bundle small (importing all of lucide would ship ~1,500 icons).
 * Adding an industry with a new icon name: add it here too. Unknown names fall back to a circle.
 */
const ICONS: Record<string, LucideIcon> = {
  AlertTriangle, Banknote, Cake, Calendar, Droplets, Egg, Factory, FileText, Fish, Flame, Flower2, GraduationCap,
  Grid3x3, Home, Landmark, MapPin, Milk, Package, Palette, PawPrint, Printer, Scissors, ShieldCheck, Shirt,
  Smartphone, Snowflake, Sparkles, Sprout, Store, TrendingUp, Truck, Users, UtensilsCrossed, Waves, Wheat, Wrench, Zap,
};

export function iconFor(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Circle;
}

export function DbIcon({ name, ...props }: { name: string | null | undefined } & LucideProps) {
  const Icon = iconFor(name);
  return <Icon {...props} />;
}

export const KNOWN_ICON_NAMES = Object.keys(ICONS);
