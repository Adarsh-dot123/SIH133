import React from 'react';
import { Sparkles, Clock, TrendingUp } from 'lucide-react';

interface PredictionBadgeProps {
  availableIn12h: number;
  availableIn24h: number;
  type?: 'ICU' | 'GENERAL' | 'TOTAL';
  showDetails?: boolean;
}

export const PredictionBadge: React.FC<PredictionBadgeProps> = ({
  availableIn12h,
  availableIn24h,
  type = 'ICU',
  showDetails = false
}) => {
  return (
    <div
      className="predict-badge"
      title={`Predictive Bed Turnover Engine: ML forecast indicates +${availableIn12h} freed within 12h and +${availableIn24h} within 24h`}
    >
      <span className="predict-pulse" />
      <Sparkles size={12} />
      <span>
        +{availableIn12h} {type} (12h) | +{availableIn24h} (24h)
      </span>
      {showDetails && (
        <span style={{ fontSize: '0.7rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '2px' }}>
          <TrendingUp size={10} /> ML Forecast
        </span>
      )}
    </div>
  );
};
