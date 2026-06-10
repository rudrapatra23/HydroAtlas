import { useAppStore } from "../../stores/useAppStore";
import { motion } from "framer-motion";

interface MockData {
  rainfall: number;
  soilMoisture: number;
  runoff: number;
  dataSource: string;
  lastUpdated: string;
}

function getMockData(lat: number, lng: number, date: string): MockData {
  const seed = lat * 10000 + lng * 100 + date.split("-").reduce((a, b) => a + parseInt(b), 0);
  const random = (min: number, max: number) => {
    const x = Math.sin(seed) * 10000;
    return (x - Math.floor(x)) * (max - min) + min;
  };

  return {
    rainfall: parseFloat(random(10, 200).toFixed(1)),
    soilMoisture: parseFloat(random(20, 80).toFixed(1)),
    runoff: parseFloat(random(5, 100).toFixed(1)),
    dataSource: "ERA5-Land",
    lastUpdated: new Date().toISOString().split("T")[0],
  };
}

function IconContainer({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-[12px] transition-all duration-200 ease-out"
      style={{ backgroundColor: color ? `${color}14` : "rgba(15,23,42,0.04)" }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
      className="rounded-[16px] border border-slate-900/6 bg-slate-50/60 p-4 transition-all duration-180 ease-out"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <IconContainer color={color}>
            <span
              className="material-symbols-rounded"
              style={{ fontSize: 24, color }}
            >
              {icon}
            </span>
          </IconContainer>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-[0.14em]">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-2xl font-semibold tracking-tight"
            style={{ color }}
          >
            {value}
          </span>
          <span className="text-sm text-slate-500">{unit}</span>
        </div>
      </div>
    </motion.div>
  );
}

function SelectedLocation() {
  const selectedPoint = useAppStore((state) => state.selectedPoint);
  const timelineDate = useAppStore((state) => state.timelineDate);
  const rightSidebarOpen = useAppStore((state) => state.rightSidebarOpen);
  const setRightSidebarOpen = useAppStore((state) => state.setRightSidebarOpen);

  if (!rightSidebarOpen) {
    return (
      <motion.button
        initial={false}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => setRightSidebarOpen(true)}
        className="mt-0 flex h-12 w-12 items-center justify-center rounded-[20px] border border-slate-900/6 bg-white/92 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-[22px] transition-all duration-180 ease-out hover:shadow-[0_16px_50px_rgba(15,23,42,0.12)]"
      >
        <span className="material-symbols-rounded text-slate-600" style={{ fontSize: 20 }}>
          info
        </span>
      </motion.button>
    );
  }

  if (!selectedPoint) {
    return null;
  }

  const mockData = getMockData(selectedPoint.lat, selectedPoint.lng, timelineDate);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -1, boxShadow: "0 16px 50px rgba(15,23,42,0.12)" }}
      className="mt-0 w-full rounded-[20px] border border-slate-900/6 bg-white/92 px-5 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-[22px] transition-all duration-180 ease-out"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-900 tracking-tight">
          Selected Location
        </p>
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "rgba(15,23,42,0.04)" }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setRightSidebarOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ease-out"
        >
          <span className="material-symbols-rounded text-slate-500" style={{ fontSize: 18 }}>
            close
          </span>
        </motion.button>
      </div>

      <div className="flex gap-2 rounded-[14px] bg-slate-50/80 px-3 py-2.5 mb-4">
        <div className="flex-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.16em]">
            Latitude
          </span>
          <p className="text-sm font-medium text-slate-800">
            {selectedPoint.lat.toFixed(4)}°
          </p>
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.16em]">
            Longitude
          </span>
          <p className="text-sm font-medium text-slate-800">
            {selectedPoint.lng.toFixed(4)}°
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <KpiCard
          icon="rainy"
          label="Rainfall"
          value={mockData.rainfall}
          unit="mm"
          color="#2563EB"
        />
        <KpiCard
          icon="water_drop"
          label="Soil Moisture"
          value={mockData.soilMoisture}
          unit="%"
          color="#16A34A"
        />
        <KpiCard
          icon="waves"
          label="Runoff"
          value={mockData.runoff}
          unit="mm"
          color="#EA580C"
        />
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Data source: {mockData.dataSource}</span>
        </div>
        <span>Updated {mockData.lastUpdated}</span>
      </div>
    </motion.div>
  );
}

export default SelectedLocation;
