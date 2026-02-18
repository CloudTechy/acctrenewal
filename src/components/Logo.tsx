import React from "react";
import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="relative size-9 overflow-hidden">
        <Image
          alt="Connekt Logo"
          className="absolute h-full left-[-3%] max-w-none top-0 w-[432%]"
          src="/assets/233a2cf3fd368cfacc5b35f665aafa8da24e02e7.png"
          width={155}
          height={36}
          unoptimized
        />
      </div>
      <div className="flex flex-col items-start leading-none text-white font-['Outfit']">
        <span className="text-[21px] font-medium tracking-[0.84px]">CONNEKT</span>
        <span className="text-[8px] font-medium tracking-[0.32px] opacity-80">BROAD BAND SOLUTIONS</span>
      </div>
    </div>
  );
}
