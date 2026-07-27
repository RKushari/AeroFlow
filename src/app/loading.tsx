'use client';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3498db]/77 backdrop-blur-sm">
      <div className="relative w-[200px] h-[200px] animate-[spin_3s_linear_infinite]">
        {/* Trail of dots */}
        {[...Array(21)].map((_, i) => {
          const index = i + 1;
          const rotation = (index * -12) - 15;
          const size = 12 - (index * 0.5);
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 bg-white rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                transform: `rotate(${rotation}deg) translateY(-90px) translate(-50%, -50%)`,
                transformOrigin: '0 0',
              }}
            />
          );
        })}

        {/* Airplane Vector Graphic */}
        <svg
          className="absolute top-1/2 left-1/2 w-[40px] h-[40px] fill-white"
          style={{ transform: 'translateY(-90px) translate(-50%, -50%) rotate(90deg)' }}
          viewBox="0 0 24 24"
        >
          <path d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z" />
        </svg>
      </div>
    </div>
  );
}
