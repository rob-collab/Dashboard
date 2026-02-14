"use client";

import {
  TrendingUp,
  Shield,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Users,
  FileText,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Shield,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Users,
  FileText,
};

interface Card {
  id?: string;
  icon: string;
  title: string;
  value: string;
  subtitle: string;
}

interface CardGridContent {
  cards: Card[];
}

interface CardGridProps {
  content: CardGridContent;
  editable: boolean;
  onChange: (data: CardGridContent) => void;
}

export default function CardGrid({ content, editable, onChange }: CardGridProps) {
  const { cards } = content;

  const updateCard = (idx: number, patch: Partial<Card>) => {
    const newCards = cards.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange({ cards: newCards });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = ICON_MAP[card.icon] ?? BarChart3;
        return (
          <div
            key={card.id ?? i}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-updraft-pale-purple/40 p-2">
                <Icon className="h-5 w-5 text-updraft-bright-purple" />
              </div>
              <div className="flex-1 min-w-0">
                {editable ? (
                  <>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => updateCard(i, { title: e.target.value })}
                      className="w-full text-xs text-fca-gray bg-transparent outline-none"
                      placeholder="Title"
                    />
                    <input
                      type="text"
                      value={card.value}
                      onChange={(e) => updateCard(i, { value: e.target.value })}
                      className="w-full text-xl font-bold text-updraft-deep bg-transparent outline-none"
                      placeholder="Value"
                    />
                    <input
                      type="text"
                      value={card.subtitle}
                      onChange={(e) => updateCard(i, { subtitle: e.target.value })}
                      className="w-full text-xs text-fca-gray bg-transparent outline-none"
                      placeholder="Subtitle"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-xs text-fca-gray">{card.title}</p>
                    <p className="text-xl font-bold text-updraft-deep">{card.value}</p>
                    <p className="text-xs text-fca-gray">{card.subtitle}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
