
import { Card } from '../components/Card';

export interface ActivityFeedItem {
  id: string;
  /** Allerede oversat/formateret tekst — denne komponent kender ikke til i18n. */
  description: string;
  timestamp: string;
}

export interface ActivityFeedProps {
  title: string;
  items: readonly ActivityFeedItem[];
  emptyLabel: string;
}

export function ActivityFeed({ title, items, emptyLabel }: ActivityFeedProps) {
  return (
    <Card>
      <div style={{ fontSize: 13, color: '#5c5c66', marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 14, color: '#5c5c66' }}>{emptyLabel}</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                fontSize: 14,
                borderBottom: '1px solid #e2e2e5',
              }}
            >
              <span>{item.description}</span>
              <span style={{ color: '#5c5c66' }}>{item.timestamp}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
