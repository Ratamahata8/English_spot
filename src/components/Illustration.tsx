import { byId } from '../lessons';
const BASE = import.meta.env.BASE_URL;
export function Illustration({ id, className = '' }: { id: string; className?: string }) {
  const w = byId(id);
  return <img className={className} src={BASE + w.image} alt={w.ru} />;
}
