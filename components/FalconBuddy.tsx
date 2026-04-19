type FalconBuddyProps = {
  compact?: boolean;
};

export default function FalconBuddy({ compact = false }: FalconBuddyProps) {
  const size = compact ? "h-14 w-14" : "h-20 w-20";
  const eye = compact ? "h-1.5 w-1.5" : "h-2 w-2";
  const beak = compact
    ? "border-l-[7px] border-r-[7px] border-t-[10px]"
    : "border-l-[9px] border-r-[9px] border-t-[13px]";

  return (
    <div className={`relative ${size}`}>
      <div className="absolute inset-0 rounded-full bg-[#ECECEC]" />

      <div className="absolute inset-[10%] rounded-full border-[2.5px] border-black bg-white">
        <div className="absolute left-[16%] top-[44%] h-[14%] w-[16%] rounded-full border-[2.5px] border-black bg-white" />
        <div className="absolute right-[16%] top-[44%] h-[14%] w-[16%] rounded-full border-[2.5px] border-black bg-white" />

        <div className="absolute left-[24%] top-[40%] h-[10%] w-[16%] rounded-full border-[2.5px] border-black bg-white" />
        <div className="absolute right-[24%] top-[40%] h-[10%] w-[16%] rounded-full border-[2.5px] border-black bg-white" />

        <div className={`absolute left-[29%] top-[47%] ${eye} rounded-full bg-black`} />
        <div className={`absolute right-[29%] top-[47%] ${eye} rounded-full bg-black`} />

        <div className="absolute left-1/2 top-[18%] h-[10%] w-[28%] -translate-x-1/2 rounded-full border-[2.5px] border-black bg-white" />

        <div
          className={`absolute left-1/2 top-[58%] h-0 w-0 -translate-x-1/2 border-l-transparent border-r-transparent border-t-black ${beak}`}
        />

        <div className="absolute left-[41%] top-[63%] h-[3px] w-[18%] rounded-full bg-black/10" />
      </div>
    </div>
  );
}