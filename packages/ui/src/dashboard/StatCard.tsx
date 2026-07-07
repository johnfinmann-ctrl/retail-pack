
import { Card } from '../components/Card';

import type { DashboardWidget } from './types';

export interface StatCardProps {
  widget: DashboardWidget;
  /** Oversat titel — selve i18n-opslaget sker i den kaldende app/shell. */
  title: string;
}

const trendColor: Record<'up' | 'down' | 'flat', string> = {
  up: '#1e8e3e',
  down: '#d93025',
  flat: '#5c5c66',
};

const trendSymbol: Record<'up' | 'down' | 'flat', string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

/** Bevidst enkelt — PRS §20: "Dashboard skal være enkelt. Ikke mange grafer." */
export function StatCard({ widget, title }: StatCardProps) {
  return (
    <Card
      onClick={widget.onClick}
      style={{ cursor: widget.onClick ? 'pointer' : 'default' }}
      role={widget.onClick ? 'button' : undefined}
    >
      <div style={{ fontSize: 13, color: '#5c5c66', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{widget.value}</div>
      {widget.trend && (
        <div style={{ fontSize: 13, color: trendColor[widget.trend.direction], marginTop: 4 }}>
          {trendSymbol[widget.trend.direction]} {widget.trend.value}%
        </div>
      )}
    </Card>
  );
}
