import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { usePrices } from '@/hooks/usePrices';

type TimeRange = '1H' | '24H' | '7D';

export function TrapaniChart() {
  const { trapani: currentPrice } = usePrices();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [priceChange, setPriceChange] = useState(0);
  const [chartData, setChartData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate and update price history
  useEffect(() => {
    const generateMockData = () => {
      const points = timeRange === '1H' ? 60 : timeRange === '24H' ? 96 : 168;
      const variance = 0.03; // 3% variance for smoother movement
      const data: number[] = [];
      
      // Create smooth price curve
      for (let i = 0; i < points; i++) {
        const progress = i / points;
        const wave = Math.sin(progress * Math.PI * 4) * variance;
        const trend = (Math.random() - 0.5) * variance * 0.5;
        const price = currentPrice * (1 + wave + trend);
        data.push(price);
      }
      
      return data;
    };

    const updateChart = () => {
      setIsLoading(true);
      
      const data = generateMockData();
      setChartData(data);
      
      // Calculate price change
      if (data.length > 0) {
        const change = ((data[data.length - 1] - data[0]) / data[0]) * 100;
        setPriceChange(change);
      }
      
      setIsLoading(false);
    };

    // Initial update
    updateChart();

    // Update every 2 seconds for smooth animation
    const interval = setInterval(updateChart, 2000);

    return () => clearInterval(interval);
  }, [timeRange, currentPrice]);

  const renderChart = () => {
    if (chartData.length === 0) return null;

    const max = Math.max(...chartData);
    const min = Math.min(...chartData);
    const range = max - min;
    
    // Determine color based on price change
    const isPositive = priceChange >= 0;
    const strokeColor = isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'; // green-500 : red-500

    return (
      <svg viewBox="0 0 100 40" className="w-full h-28" preserveAspectRatio="none">
        {/* Thin line */}
        <path
          d={`M ${chartData
            .map((price, i) => {
              const x = (i / (chartData.length - 1)) * 100;
              const y = 35 - ((price - min) / range) * 30;
              return `${x},${y}`;
            })
            .join(' L ')}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
    );
  };

  const isPositive = priceChange >= 0;

  return (
    <Card className="p-6 bg-gradient-card border-border/50">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">$TRAPANI</h2>
            <div className="flex items-baseline gap-3 mt-1">
              <p className="text-3xl font-bold">${currentPrice.toFixed(6)}</p>
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                isPositive 
                  ? 'bg-green-500/10 text-green-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
          </div>
          
          {/* Time range selector */}
          <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
            {(['1H', '24H', '7D'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  timeRange === range
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="relative">
          {isLoading ? (
            <div className="h-24 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            renderChart()
          )}
        </div>

        {/* Chart label */}
        <p className="text-xs text-muted-foreground text-center">
          Live price • Updates every 2 seconds
        </p>
      </div>
    </Card>
  );
}
