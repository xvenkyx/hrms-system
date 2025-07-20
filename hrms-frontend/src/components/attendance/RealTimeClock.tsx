import { useState, useEffect } from 'react';

interface RealTimeClockProps {
  className?: string;
}

export function RealTimeClock({ className = '' }: RealTimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={`text-center ${className}`}>
      <div className="text-4xl font-bold text-blue-600 mb-2">
        {formatTime(currentTime)}
      </div>
      <div className="text-lg text-gray-600">
        {formatDate(currentTime)}
      </div>
    </div>
  );
}